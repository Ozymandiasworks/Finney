# Security Policy

## Reporting a Vulnerability

Security is a primary design concern of Finney.

If you discover a security or privacy vulnerability, please **do not open a public GitHub issue** or publicly disclose the vulnerability before it has been investigated.

This includes vulnerabilities involving, but not limited to:

* Encryption or key exchange
* Authentication or identity verification
* Message confidentiality or integrity
* Private-key or seed handling
* Transaction signing or construction
* Finney Stamp or XEC payment mechanisms
* Relay or transport security
* Metadata leakage
* Message replay, impersonation, or forgery
* Address or identity correlation
* Dependency vulnerabilities that could compromise Finney
* Circumvention of security or privacy protections

Please report security vulnerabilities through **GitHub Private Vulnerability Reporting** when available.

When submitting a report, please include as much of the following information as possible:

* A description of the vulnerability
* The affected component or version
* Steps required to reproduce the issue
* Expected and observed behavior
* Potential security or privacy impact
* Any proof-of-concept code or test data
* Suggested mitigation, if known

Please do not include real private keys, wallet seeds, passwords, or other sensitive credentials in a report.

## Supported Versions

Finney is currently under active development and has not yet reached a stable production release.

Until a stable release is published, security fixes will generally be applied to the current development version rather than maintained across older development builds.

| Version                     | Supported         |
| --------------------------- | ----------------- |
| Current development version | Yes               |
| Older development builds    | No                |
| Stable releases             | Not yet available |

## Responsible Disclosure

We ask security researchers to provide a reasonable opportunity to investigate and correct a vulnerability before publicly disclosing it.

We will make a good-faith effort to acknowledge legitimate security reports, investigate them promptly, and provide information about remediation when appropriate.

## Development Status

Finney is experimental software currently under active development.

The presence of this security policy should not be interpreted as a claim that Finney has undergone a professional security audit or that the software is suitable for protecting high-value or highly sensitive communications.

Cryptographic and security-sensitive components should be considered experimental until they have received appropriate independent review.
