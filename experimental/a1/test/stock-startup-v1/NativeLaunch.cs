using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace FinneyA1Qualification
{
    public sealed class NativeLaunch : IDisposable
    {
        [StructLayout(LayoutKind.Sequential)]
        struct SecurityAttributes
        {
            public int Length;
            public IntPtr Descriptor;
            [MarshalAs(UnmanagedType.Bool)] public bool Inherit;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        struct StartupInfo
        {
            public int Size;
            public string Reserved, Desktop, Title;
            public int X, Y, Width, Height, Columns, Rows, Fill, Flags;
            public short Show, ReservedSize;
            public IntPtr ReservedBytes, Input, Output, Error;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct StartupInfoEx { public StartupInfo Startup; public IntPtr Attributes; }

        [StructLayout(LayoutKind.Sequential)]
        struct ProcessInfo { public IntPtr Process, Thread; public uint ProcessId, ThreadId; }

        [StructLayout(LayoutKind.Sequential)]
        struct FileTime { public uint Low, High; }

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool CreatePipe(out IntPtr read, out IntPtr write, ref SecurityAttributes security, uint size);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern IntPtr CreateFileW(string name, uint access, uint share, ref SecurityAttributes security,
            uint disposition, uint flags, IntPtr template);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute,
            IntPtr value, IntPtr size, IntPtr previous, IntPtr returned);
        [DllImport("kernel32.dll")]
        static extern void DeleteProcThreadAttributeList(IntPtr list);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern bool CreateProcessW(string image, StringBuilder commandLine, IntPtr processSecurity,
            IntPtr threadSecurity, bool inheritHandles, uint flags, IntPtr environment, string cwd,
            ref StartupInfoEx startup, out ProcessInfo process);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool GetExitCodeProcess(IntPtr process, out uint code);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool GetProcessTimes(IntPtr process, out FileTime created, out FileTime exited,
            out FileTime kernel, out FileTime user);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
        [DllImport("kernel32.dll")]
        static extern bool CloseHandle(IntPtr handle);
        [DllImport("user32.dll", SetLastError = true)]
        static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
        [DllImport("user32.dll", SetLastError = true)]
        static extern bool PostMessageW(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);

        const uint CreationFlags = 0x00080400;
        const int MaximumOutput = 1048576;
        readonly string image, command, cwd;
        readonly byte[] environment;
        readonly string outputPath, errorPath;
        IntPtr input, outputWrite, errorWrite, outputRead, errorRead, process;
        Thread outputThread, errorThread;
        long outputBytes, errorBytes;
        volatile bool readFailed;
        volatile bool started;
        bool disposed;
        readonly object outputLock = new object();
        readonly MemoryStream capturedOutput = new MemoryStream();

        public uint ProcessId { get; private set; }
        public string CreationTime { get; private set; }
        public string InputHandle { get { return input.ToInt64().ToString("X"); } }
        public string OutputHandle { get { return outputWrite.ToInt64().ToString("X"); } }
        public string ErrorHandle { get { return errorWrite.ToInt64().ToString("X"); } }
        public uint Flags { get { return CreationFlags; } }
        public bool OutputOverflow { get { return Interlocked.Read(ref outputBytes) > MaximumOutput ||
            Interlocked.Read(ref errorBytes) > MaximumOutput; } }
        public bool ReadFailed { get { return readFailed; } }
        public long OutputBytes { get { return Interlocked.Read(ref outputBytes); } }
        public long ErrorBytes { get { return Interlocked.Read(ref errorBytes); } }
        public bool DrainComplete { get { return outputThread != null && errorThread != null &&
            !outputThread.IsAlive && !errorThread.IsAlive && !readFailed; } }
        public string OutputText
        {
            get { lock (outputLock) return Encoding.UTF8.GetString(capturedOutput.ToArray()); }
        }
        public bool Exited
        {
            get
            {
                if (process == IntPtr.Zero) return false;
                uint state = WaitForSingleObject(process, 0);
                if (state == 0xFFFFFFFF) throw new Win32Exception(Marshal.GetLastWin32Error());
                return state == 0;
            }
        }
        public long? ExitCode
        {
            get
            {
                if (!Exited) return null;
                uint code;
                if (!GetExitCodeProcess(process, out code)) throw new Win32Exception(Marshal.GetLastWin32Error());
                return (long)code;
            }
        }

        public NativeLaunch(string image, string command, byte[] environment, string cwd,
            string outputPath, string errorPath)
        {
            if (String.IsNullOrEmpty(image) || String.IsNullOrEmpty(command) || command.Length > 32766 ||
                command.IndexOf('\0') >= 0 || environment == null || environment.Length < 4 ||
                environment.Length > 65534 || environment.Length % 2 != 0 ||
                environment[environment.Length - 1] != 0 || environment[environment.Length - 2] != 0 ||
                environment[environment.Length - 3] != 0 || environment[environment.Length - 4] != 0)
                throw new ArgumentException("INVALID_NATIVE_INPUT");
            this.image = image;
            this.command = command;
            this.environment = (byte[])environment.Clone();
            this.cwd = cwd;
            this.outputPath = outputPath;
            this.errorPath = errorPath;
            SecurityAttributes security = new SecurityAttributes {
                Length = Marshal.SizeOf(typeof(SecurityAttributes)), Inherit = true };
            try
            {
                if (!CreatePipe(out outputRead, out outputWrite, ref security, 4096) ||
                    !CreatePipe(out errorRead, out errorWrite, ref security, 4096) ||
                    !SetHandleInformation(outputRead, 1, 0) || !SetHandleInformation(errorRead, 1, 0))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                input = CreateFileW("NUL", 0x80000000, 3, ref security, 3, 0, IntPtr.Zero);
                if (input == new IntPtr(-1)) { input = IntPtr.Zero; throw new Win32Exception(Marshal.GetLastWin32Error()); }
            }
            catch { Dispose(); throw; }
        }

        static void Release(ref IntPtr handle)
        {
            if (handle != IntPtr.Zero) { CloseHandle(handle); handle = IntPtr.Zero; }
        }

        void Drain(IntPtr handle, string destination, bool standardOutput)
        {
            try
            {
                using (var stream = new FileStream(new SafeFileHandle(handle, true), FileAccess.Read))
                using (var file = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.Read))
                {
                    byte[] bytes = new byte[4096];
                    int count;
                    long total = 0;
                    while ((count = stream.Read(bytes, 0, bytes.Length)) > 0)
                    {
                        int keep = (int)Math.Min(count, Math.Max(0, MaximumOutput - total));
                        if (keep > 0)
                        {
                            file.Write(bytes, 0, keep);
                            file.Flush();
                            if (standardOutput) lock (outputLock) capturedOutput.Write(bytes, 0, keep);
                        }
                        total += count;
                        if (standardOutput) Interlocked.Exchange(ref outputBytes, total);
                        else Interlocked.Exchange(ref errorBytes, total);
                    }
                }
            }
            catch { readFailed = true; }
        }

        public void Start()
        {
            if (started || disposed) throw new InvalidOperationException("SINGLE_ATTEMPT_ONLY");
            started = true;
            IntPtr size = IntPtr.Zero, attributes = IntPtr.Zero, handles = IntPtr.Zero, env = IntPtr.Zero;
            bool initialized = false;
            try
            {
                InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
                if (size == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
                attributes = Marshal.AllocHGlobal(size);
                if (!InitializeProcThreadAttributeList(attributes, 1, 0, ref size))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                initialized = true;
                handles = Marshal.AllocHGlobal(IntPtr.Size * 3);
                Marshal.WriteIntPtr(handles, 0, input);
                Marshal.WriteIntPtr(handles, IntPtr.Size, outputWrite);
                Marshal.WriteIntPtr(handles, IntPtr.Size * 2, errorWrite);
                if (!UpdateProcThreadAttribute(attributes, 0, new IntPtr(0x00020002), handles,
                    new IntPtr(IntPtr.Size * 3), IntPtr.Zero, IntPtr.Zero))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                env = Marshal.AllocHGlobal(environment.Length);
                Marshal.Copy(environment, 0, env, environment.Length);
                var startup = new StartupInfoEx { Attributes = attributes };
                startup.Startup.Size = Marshal.SizeOf(typeof(StartupInfoEx));
                startup.Startup.Flags = 0x100;
                startup.Startup.Input = input;
                startup.Startup.Output = outputWrite;
                startup.Startup.Error = errorWrite;
                ProcessInfo info;
                if (!CreateProcessW(image, new StringBuilder(command), IntPtr.Zero, IntPtr.Zero, true,
                    CreationFlags, env, cwd, ref startup, out info))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                process = info.Process;
                ProcessId = info.ProcessId;
                CloseHandle(info.Thread);
                Release(ref input);
                Release(ref outputWrite);
                Release(ref errorWrite);
                IntPtr outPipe = outputRead, errPipe = errorRead;
                outputRead = errorRead = IntPtr.Zero;
                outputThread = new Thread(() => Drain(outPipe, outputPath, true)) { IsBackground = true };
                errorThread = new Thread(() => Drain(errPipe, errorPath, false)) { IsBackground = true };
                outputThread.Start();
                errorThread.Start();
                FileTime created, exited, kernel, user;
                if (!GetProcessTimes(process, out created, out exited, out kernel, out user))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                CreationTime = (((ulong)created.High << 32) | created.Low).ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
            finally
            {
                if (initialized) DeleteProcThreadAttributeList(attributes);
                if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
                if (handles != IntPtr.Zero) Marshal.FreeHGlobal(handles);
                if (env != IntPtr.Zero) Marshal.FreeHGlobal(env);
            }
        }

        public bool RequestNormalClose()
        {
            if (Exited) return false;
            using (var target = Process.GetProcessById((int)ProcessId))
            {
                IntPtr window = target.MainWindowHandle;
                uint owner;
                if (window == IntPtr.Zero || GetWindowThreadProcessId(window, out owner) == 0 || owner != ProcessId)
                    return false;
                return PostMessageW(window, 0x0010, IntPtr.Zero, IntPtr.Zero);
            }
        }

        public void Dispose()
        {
            if (disposed) return;
            disposed = true;
            Release(ref input); Release(ref outputWrite); Release(ref errorWrite);
            Release(ref outputRead); Release(ref errorRead); Release(ref process);
        }
    }
}
