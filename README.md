<div align="center">
  <h1 align="center">SNIPs</h1>
  <p align="center">
    <a href="https://community.starknet.io/">
        <img src="https://img.shields.io/badge/StarkNet%20Shamans-5C4C9F?style=for-the-badge&logo=startrek&logoColor=white">
    </a>
    <a href="https://twitter.com/intent/follow?screen_name=StarkNetFndn">
        <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white">
    </a>       
  </p>
  
  <h3 align="center">StarkNet Improvement Proposal repository.</h3>
</div>

[![Project license](https://img.shields.io/github/license/starknet-community-libs/SNIPs.svg?style=flat-square)](LICENSE)
[![Pull Requests welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg?style=flat-square)](https://github.com/starknet-community-libs/SNIPs/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
[![code with love by StarkNet community](https://img.shields.io/badge/%3C%2F%3E%20with%20%E2%99%A5%20by-StarkNet%20Community-ff1414.svg?style=flat-square)](https://github.com/starknet-community-libs)

## Mission

The goal of the SNIP project is to document standardized protocols for StarkNet related softwares and to document them in a high quality and implementable way.

## SNIP Process

### Overview

The SNIP process is the process that a contributor goes through to propose a change to the StarkNet ecosystem. It is inspired by the [EIP process](https://eips.ethereum.org/EIPS/eip-1).

Here is the process that a contributor should follow:

1. Review [SNIP-1](./SNIPs/snip-1.md).
2. Fork the repository by clicking "Fork" in the top right.
3. Add your SNIP to your fork of the repository. There is a [template SNIP here](./SNIPs/snip-template.md).
4. Submit a Pull Request to [SNIPs repository](https://github.com/starknet-community-libs/SNIPs)

Your first PR should be a first draft of the final SNIP. It must meet the formatting criteria enforced by the build (largely, correct metadata in the header). An editor will manually review the first PR for a new SNIP and assign it a number before merging it. Make sure you include a `discussions-to` header with the URL to a discussion forum or open GitHub issue where people can discuss the SNIP as a whole.

### SNIP life cycle

Once a SNIP is merged, it is considered `Draft`. The SNIP author may then continue to work on the SNIP, gathering feedback and making changes. The SNIP author can request a review from the SNIP editors by adding the `review-requested` label to the PR. The SNIP editors will review the PR and either approve it, request changes, or close it with an explanation. For a SNIP to be `Accepted` it must meet certain minimum criteria. It must be a clear and complete description of the proposed enhancement. The enhancement must represent a net improvement. The proposed implementation, if applicable, must be solid and must not complicate the protocol unduly.

Once a SNIP has been `Accepted`, the reference implementation must be completed. When the reference implementation is complete and incorporated into the main source code repository, the status will be changed to `Final`.

To update a `Draft` SNIP, the author can submit a PR making the required changes. Note that, because the SNIPs are stored as markdown files in a versioned repository, there is no particular advantage to updating the version of a SNIP. In particular, the SNIP editors don't have to list the `Draft` SNIPs, they can just list the `Final` SNIPs.

Lifecycle overview:

![SNIP lifecycle](./assets/snip-1/SNIP-process-update.jpg)

## Credits

The SNIPs repository was heavily inspired by [EIPs](https://github.com/ethereum/EIPs).

Shout out to all EIP editors and active contributors.
