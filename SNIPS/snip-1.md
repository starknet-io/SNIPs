---
snip: 1
title: SNIP Purpose and Guidelines
status: Living
type: Meta
author: Martín Triay <martriay@gmail.com>
created: 2022-06-03
---

## What is a SNIP?

SNIP stands for StarkNet Improvement Proposal. A SNIP is a design document providing information to the StarkNet community, or describing a new feature for StarkNet or its processes or environment. The SNIP should provide a concise technical specification of the feature and a rationale for the feature. The SNIP author is responsible for building consensus within the community and documenting dissenting opinions.

## SNIP Rationale

We intend SNIPs to be the primary mechanisms for proposing new features, for collecting community technical input on an issue, and for documenting the design decisions that have gone into StarkNet. Because the SNIPs are maintained as text files in a versioned repository, their revision history is the historical record of the feature proposal.

For StarkNet implementers, SNIPs are a convenient way to track the progress of their implementation. Ideally each implementation maintainer would list the SNIPs that they have implemented. This will give end users a convenient way to know the current status of a given implementation or library.

## SNIP Types

There are three types of SNIPs:

- A **Standards Track SNIP** describes any change that affects most or all StarkNet implementations, such as—a change to the network protocol, a change in block or transaction validity rules, proposed application standards/conventions, or any change or addition that affects the interoperability of applications using StarkNet. Standards Track SNIPs consist of two parts—a design document, an implementation. Furthermore, Standards Track SNIPs can be broken down into the following categories:

  - **Core**: improvements requiring a consensus fork, as well as changes that are not necessarily consensus critical but may be relevant to [“core dev” discussions](https://community.starknet.io/).
  - **Networking**: includes proposed improvements to network protocol specifications.
  - **Interface**: includes improvements around client [API/RPC](https://github.com/starkware-libs/starknet-specs) specifications and standards, and also certain language-level standards like method names and Contract ABIs. The label “interface” aligns with the [interfaces repo] and discussion should primarily occur in that repository before a SNIP is submitted to the SNIPs repository.
  - **SRC**: application-level standards and conventions, including contract standards such as token standards ([SNIP-20](./snip-20.md)), URI schemes, library/package formats, and wallet formats.

- A **Meta SNIP** describes a process surrounding StarkNet or proposes a change to (or an event in) a process. Process SNIPs are like Standards Track SNIPs but apply to areas other than the StarkNet protocol itself. They may propose an implementation, but not to StarkNet's codebase; they often require community consensus; unlike Informational SNIPs, they are more than recommendations, and users are typically not free to ignore them. Examples include procedures, guidelines, changes to the decision-making process, and changes to the tools or environment used in StarkNet development. Any meta-SNIP is also considered a Process SNIP.

- An **Informational SNIP** describes an StarkNet design issue, or provides general guidelines or information to the StarkNet community, but does not propose a new feature. Informational SNIPs do not necessarily represent StarkNet community consensus or a recommendation, so users and implementers are free to ignore Informational SNIPs or follow their advice.

It is highly recommended that a single SNIP contain a single key proposal or new idea. The more focused the SNIP, the more successful it tends to be. A change to one client doesn't require a SNIP; a change that affects multiple clients, or defines a standard for multiple apps to use, does.

A SNIP must meet certain minimum criteria. It must be a clear and complete description of the proposed enhancement. The enhancement must represent a net improvement. The proposed implementation, if applicable, must be solid and must not complicate the protocol unduly.

## SNIP Work Flow

### Shepherding a SNIP

Parties involved in the process are you, the champion or _SNIP author_, the [_SNIP editors_](#snip-editors), and the [_StarkNet Core Developers_](https://community.starknet.io/).

Before you begin writing a formal SNIP, you should vet your idea. Ask the StarkNet community first if an idea is original to avoid wasting time on something that will be rejected based on prior research. It is thus recommended to open a discussion thread on [the StarkNet community forum](https://community.starknet.io/) to do this.

Once the idea has been vetted, your next responsibility will be to present (by means of a SNIP) the idea to the reviewers and all interested parties, invite editors, developers, and the community to give feedback on the aforementioned channels. You should try and gauge whether the interest in your SNIP is commensurate with both the work involved in implementing it and how many parties will have to conform to it. For example, the work required for implementing a Core SNIP will be much greater than for an SRC and the SNIP will need sufficient interest from the StarkNet client teams. Negative community feedback will be taken into consideration and may prevent your SNIP from moving past the Draft stage.

### Core SNIPs

For Core SNIPs, given that they require client implementations to be considered **Final** (see "SNIPs Process" below), you will need to either provide an implementation for clients or convince clients to implement your SNIP.

The best way to get client implementers to review your SNIP is to present it on a community call. You can request to do so by posting a comment linking your SNIP on [the StarkNet community forum](https://community.starknet.io/).

The AllCoreDevs call serves as a way for client implementers to do three things. First, to discuss the technical merits of SNIPs. Second, to gauge what other clients will be implementing. Third, to coordinate SNIP implementation for network upgrades.

These calls generally result in a "rough consensus" around what SNIPs should be implemented. This "rough consensus" rests on the assumptions that SNIPs are not contentious enough to cause a network split and that they are technically sound.

:warning: The SNIPs process and AllCoreDevs call were not designed to address contentious non-technical issues, but, due to the lack of other ways to address these, often end up entangled in them. This puts the burden on client implementers to try and gauge community sentiment, which hinders the technical coordination function of SNIPs and AllCoreDevs calls. If you are shepherding a SNIP, you can make the process of building community consensus easier by making sure that [the StarkNet community forum](https://community.starknet.io/) thread for your SNIP includes or links to as much of the community discussion as possible and that various stakeholders are well-represented.

_In short, your role as the champion is to write the SNIP using the style and format described below, shepherd the discussions in the appropriate forums, and build community consensus around the idea._

### SNIP Process

The following is the standardization process for all SNIPs in all tracks:

![SNIP Status Diagram](../assets/snip-1/SNIP-process-update.jpg)

**Idea** - An idea that is pre-draft. This is not tracked within the SNIP Repository.

**Draft** - The first formally tracked stage of a SNIP in development. A SNIP is merged by a SNIP Editor into the SNIP repository when properly formatted.

**Review** - A SNIP Author marks a SNIP as ready for and requesting Peer Review.

**Last Call** - This is the final review window for a SNIP before moving to `Final`. A SNIP editor will assign `Last Call` status and set a review end date (`last-call-deadline`), typically 14 days later.

If this period results in necessary normative changes it will revert the SNIP to `Review`.

**Final** - This SNIP represents the final standard. A Final SNIP exists in a state of finality and should only be updated to correct errata and add non-normative clarifications.

**Stagnant** - Any SNIP in `Draft` or `Review` or `Last Call` if inactive for a period of 6 months or greater is moved to `Stagnant`. A SNIP may be resurrected from this state by Authors or SNIP Editors through moving it back to `Draft` or it's earlier status. If not resurrected, a proposal may stay forever in this status.

> _SNIP Authors are notified of any algorithmic change to the status of their SNIP_

**Withdrawn** - The SNIP Author(s) have withdrawn the proposed SNIP. This state has finality and can no longer be resurrected using this SNIP number. If the idea is pursued at later date it is considered a new proposal.

**Living** - A special status for SNIPs that are designed to be continually updated and not reach a state of finality. This includes most notably SNIP-1.

## What belongs in a successful SNIP?

Each SNIP should have the following parts:

- Preamble - RFC 822 style headers containing metadata about the SNIP, including the SNIP number, a short descriptive title (limited to a maximum of 44 characters), a description (limited to a maximum of 140 characters), and the author details. Irrespective of the category, the title and description should not include SNIP number. See [below](./snip-1.md#snip-header-preamble) for details.
- Abstract - Abstract is a multi-sentence (short paragraph) technical summary. This should be a very terse and human-readable version of the specification section. Someone should be able to read only the abstract to get the gist of what this specification does.
- Motivation (\*optional) - A motivation section is critical for SNIPs that want to change the StarkNet protocol. It should clearly explain why the existing protocol specification is inadequate to address the problem that the SNIP solves. SNIP submissions without sufficient motivation may be rejected outright.
- Specification - The technical specification should describe the syntax and semantics of any new feature. The specification should be detailed enough to allow competing, interoperable implementations for any of the current StarkNet platforms (cpp-ethereum, go-ethereum, parity, ethereumJ, ethereumjs-lib, [and others](https://github.com/ethereum/wiki/wiki/Clients).
- Rationale - The rationale fleshes out the specification by describing what motivated the design and why particular design decisions were made. It should describe alternate designs that were considered and related work, e.g. how the feature is supported in other languages. The rationale should discuss important objections or concerns raised during discussion around the SNIP.
- Backwards Compatibility - All SNIPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. The SNIP must explain how the author proposes to deal with these incompatibilities. SNIP submissions without a sufficient backwards compatibility treatise may be rejected outright.
- Test Cases - Test cases for an implementation are mandatory for SNIPs that are affecting consensus changes. Tests should either be inlined in the SNIP as data (such as input/expected output pairs, or included in `../assets/snip-###/<filename>`.
- Reference Implementation - An optional section that contains a reference/example implementation that people can use to assist in understanding or implementing this specification.
- Security Considerations - All SNIPs must contain a section that discusses the security implications/considerations relevant to the proposed change. Include information that might be important for security discussions, surfaces risks and can be used throughout the life-cycle of the proposal. E.g. include security-relevant design decisions, concerns, important discussions, implementation-specific guidance and pitfalls, an outline of threats and risks and how they are being addressed. SNIP submissions missing the "Security Considerations" section will be rejected. A SNIP cannot proceed to status "Final" without a Security Considerations discussion deemed sufficient by the reviewers.
- Copyright Waiver - All SNIPs must be in the public domain. The copyright waiver MUST link to the license file and use the following wording: `Copyright and related rights waived via [MIT](../LICENSE).`

## SNIP Formats and Templates

SNIPs should be written in [markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) format. There is a [template](https://github.com/ethereum/SNIPs/blob/master/snip-template.md) to follow.

## SNIP Header Preamble

Each SNIP must begin with an [RFC 822](https://www.ietf.org/rfc/rfc822.txt) style header preamble, preceded and followed by three hyphens (`---`). This header is also termed ["front matter" by Jekyll](https://jekyllrb.com/docs/front-matter/). The headers must appear in the following order.

`snip`: _SNIP number_ (this is determined by the SNIP editor)

`title`: _The SNIP title is a few words, not a complete sentence_

`description`: _Description is one full (short) sentence_

`author`: _The list of the author's or authors' name(s) and/or username(s), or name(s) and email(s). Details are below._

`discussions-to`: _The url pointing to the official discussion thread_

`status`: _Draft, Review, Last Call, Final, Stagnant, Withdrawn, Living_

`last-call-deadline`: _The date last call period ends on_ (Optional field, only needed when status is `Last Call`)

`type`: _One of `Standards Track`, `Meta`, or `Informational`_

`category`: _One of `Core`, `Networking`, `Interface`, or `SRC`_ (Optional field, only needed for `Standards Track` SNIPs)

`created`: _Date the SNIP was created on_

`requires`: _SNIP number(s)_ (Optional field)

`withdrawal-reason`: _A sentence explaining why the SNIP was withdrawn._ (Optional field, only needed when status is `Withdrawn`)

Headers that permit lists must separate elements with commas.

Headers requiring dates will always do so in the format of ISO 8601 (yyyy-mm-dd).

#### `author` header

The `author` header lists the names, email addresses or usernames of the authors/owners of the SNIP. Those who prefer anonymity may use a username only, or a first name and a username. The format of the `author` header value must be:

> Random J. User &lt;address@dom.ain&gt;

or

> Random J. User (@username)

if the email address or GitHub username is included, and

> Random J. User

if the email address is not given.

It is not possible to use both an email and a GitHub username at the same time. If important to include both, one could include their name twice, once with the GitHub username, and once with the email.

At least one author must use a GitHub username, in order to get notified on change requests and have the capability to approve or reject them.

#### `discussions-to` header

While a SNIP is a draft, a `discussions-to` header will indicate the URL where the SNIP is being discussed.

The preferred discussion URL is a topic on [StarkNet Magicians](https://ethereum-magicians.org/). The URL cannot point to Github pull requests, any URL which is ephemeral, and any URL which can get locked over time (i.e. Reddit topics).

#### `type` header

The `type` header specifies the type of SNIP: Standards Track, Meta, or Informational. If the track is Standards please include the subcategory (core, networking, interface, or SRC).

#### `category` header

The `category` header specifies the SNIP's category. This is required for standards-track SNIPs only.

#### `created` header

The `created` header records the date that the SNIP was assigned a number. Both headers should be in yyyy-mm-dd format, e.g. 2001-08-14.

#### `requires` header

SNIPs may have a `requires` header, indicating the SNIP numbers that this SNIP depends on.

## Linking to External Resources

Links to external resources **SHOULD NOT** be included. External resources may disappear, move, or change unexpectedly.

## Linking to other SNIPs

References to other SNIPs should follow the format `SNIP-N` where `N` is the SNIP number you are referring to. Each SNIP that is referenced in a SNIP **MUST** be accompanied by a relative markdown link the first time it is referenced, and **MAY** be accompanied by a link on subsequent references. The link **MUST** always be done via relative paths so that the links work in this GitHub repository, forks of this repository, the main SNIPs site, mirrors of the main SNIP site, etc. For example, you would link to this SNIP with `[SNIP-1](./snip-1.md)`.

## Auxiliary Files

Images, diagrams and auxiliary files should be included in a subdirectory of the `assets` folder for that SNIP as follows: `assets/snip-N` (where **N** is to be replaced with the SNIP number). When linking to an image in the SNIP, use relative links such as `../assets/snip-1/image.png`.

## Transferring SNIP Ownership

It occasionally becomes necessary to transfer ownership of SNIPs to a new champion. In general, we'd like to retain the original author as a co-author of the transferred SNIP, but that's really up to the original author. A good reason to transfer ownership is because the original author no longer has the time or interest in updating it or following through with the SNIP process, or has fallen off the face of the 'net (i.e. is unreachable or isn't responding to email). A bad reason to transfer ownership is because you don't agree with the direction of the SNIP. We try to build consensus around a SNIP, but if that's not possible, you can always submit a competing SNIP.

If you are interested in assuming ownership of a SNIP, send a message asking to take over, addressed to both the original author and the SNIP editor. If the original author doesn't respond to the email in a timely manner, the SNIP editor will make a unilateral decision (it's not like such decisions can't be reversed :)).

## SNIP Editors

The current SNIP editors are:

- Abdelhamid Bakhta (@abdelhamidbakhta)
- Louis Guthman (@GuthL)
- Jag Lotus (@jag-lotus)

Emeritus SNIP editors are:

## SNIP Editor Responsibilities

For each new SNIP that comes in, an editor does the following:

- Read the SNIP to check if it is ready: sound and complete. The ideas must make technical sense, even if they don't seem likely to get to final status.
- The title should accurately describe the content.
- Check the SNIP for language (spelling, grammar, sentence structure, etc.), markup (GitHub flavored Markdown), code style

If the SNIP isn't ready, the editor will send it back to the author for revision, with specific instructions.

Once the SNIP is ready for the repository, the SNIP editor will:

- Assign a SNIP number (generally the PR number, but the decision is with the editors)
- Merge the corresponding [pull request](https://github.com/ethereum/SNIPs/pulls)
- Send a message back to the SNIP author with the next step.

Many SNIPs are written and maintained by developers with write access to the StarkNet codebase. The SNIP editors monitor SNIP changes, and correct any structure, grammar, spelling, or markup mistakes we see.

The editors don't pass judgment on SNIPs. We merely do the administrative & editorial part.

## Style Guide

### Titles

The `title` field in the preamble:

- Should not include the word "standard" or any variation thereof; and
- Should not include the SNIP's number.

### Descriptions

The `description` field in the preamble:

- Should not include the word "standard" or any variation thereof; and
- Should not include the SNIP's number.

### SNIP numbers

When referring to a SNIP by number, it should be written in the hyphenated form `SNIP-X` where `X` is the SNIP's assigned number.

### RFC 2119

SNIPs are encouraged to follow [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) for terminology and to insert the following at the beginning of the Specification section:

> The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

## History

This document was derived heavily from [Ethereum's BIP-0001](https://github.com/ethereum/EIPs) which in turn was derived from [Bitcoin's BIP-0001](https://github.com/bitcoin/bips) written by Amir Taaki which in turn was derived from [Python's PEP-0001](https://www.python.org/dev/peps/). In many places text was simply copied and modified. Although the PEP-0001 text was written by Barry Warsaw, Jeremy Hylton, and David Goodger, they are not responsible for its use in the StarkNet Improvement Process, and should not be bothered with technical questions specific to StarkNet or the SNIP. Please direct all comments to the SNIP editors.

## Copyright

Copyright and related rights waived via [MIT](../LICENSE).
