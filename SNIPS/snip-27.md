---
snip: 27
title: Monetary Committee Charter 
description: Definition and governance framework for Starknet's Monetary Committee
author: Henri Lieutaud <@l-henri>, Aayush Giri <@Giri-Aayush>, Boaz <@BoazStark> 
discussions-to: https://community.starknet.io/t/snip-tbd-starknet-monetary-committee/115064
status: Draft
type: Meta
created: 2024-11-26
---
## Simple Summary
The SNIP establishes a four-member Monetary Committee responsible for managing Starknet's staking parameters through a multi-signature mechanism, requiring 75% consensus for implementing changes to minimum stake amounts, inflation caps, and withdrawal delays.

## Abstract
This Meta SNIP lays out the structure, motivation and decisions of the Starknet Monetary Committee. It describes the process and rules that surround the Monetary Committee.

## Motivation
Starknet's monetary policy governance requires a well-structured and reliable framework. The establishment of a Monetary Committee addresses this need by creating a dedicated body for proposing and enacting changes to the layer 2 token admin contract of the Starknet staking mechanism. The Committee, through secure multi-signature control, manages critical parameters including minimum staking amount, yearly inflation cap, and withdrawal delay. Through clear eligibility criteria, defined responsibilities, and robust operational procedures requiring 75% consensus for changes, the Committee ensures responsible oversight of Starknet's monetary mechanisms while maintaining transparency and accountability in accordance with the governing body's Code of Conduct.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Composition
The committee SHALL be composed of four firms, each providing one individual to jointly operate a multi-sig contract. Each member retains control over one key of the multi-sig. The firms and their representatives MUST maintain organizational independence to ensure diverse decision-making and risk management.
The Council administrator SHALL serve in a non-voting capacity, responsible for:

- Coordinating the monetary council's ongoing operations from an administrative perspective
- Arranging meetings and organizing votes
- Managing documentation and communications
- Ensuring procedural compliance
- Facilitating member interactions
- Maintaining operational records

The administrator's role SHALL remain strictly procedural, communicative, and ministerial in nature, without influence on parameter change decisions or voting outcomes.
All members and the administrator MUST maintain clear separation of duties and organizational independence to preserve the integrity of the committee's governance structure.

### Operational Parameter Change Flow

Each parameter change will include two steps:
- **Proposal**: Parameter change suggestion with detailed rationale
- **Execution**: Multi-sig transaction implementation

#### Parameter Change Flow
- Member proposes parameter change
- Committee reviews proposal 
- 75% consensus required for approval
- Multi-sig transaction execution
- Implementation monitoring
- Post-action report required

![Parameter Change Flow](../assets/snip-tbd/parameter-flow.png)

### Current Parameter Structure
![Parameter Structure](../assets/snip-tbd/parameter-structure.png)

### Eligibility
Members of the Monetary Committee will be selected in accordance with the following criteria:

- **Technical Competency**: Baseline proficiency with the Starknet stack and secure key management and signing standards.
- **Reputation**: Known, trusted individuals or entities that have demonstrated consistent alignment with the Starknet vision.
- **Organizational Diversity**: No more than one person from the same organization.
- **Role Responsibilities**: Members are aware of and accept the responsibilities within the role, which must be clearly defined prior to the appointment.

Additionally, all members must complete:
- KYC/KYB and sanctions screening
- Sign the appointment letter

### Compensation
Members of the Monetary Committee SHALL receive a monthly stipend of 1000 USD paid in STRK as compensation for their vigilance, accountability, and professional knowledge.

### Council Administrator
A Council administrator SHALL be responsible for coordinating the monetary council's ongoing operations from an administrative perspective, such as arranging meetings and organizing votes. The administrator's role SHALL be procedural, communicative, and ministerial in nature.

### Duties and Responsibilities

#### Scope of Work
Members SHALL be responsible for:
1. Proposing and enacting changes to the layer 2 token admin contract of the Starknet staking mechanism, including changes to:
  - Minimum staking amount
  - Yearly inflation cap
  - Withdrawal delay
2. Sending multi-sig transactions requiring 75% member consensus.
3. Complying with:
  - The Code of Conduct of the Starknet governing body.
  - Any additional internal conflict of interest procedures that the Council may develop from time to time.

#### Availability Commitment
Members MUST be responsive through the following communication channels with a maximum delay of four (4) days:
- Phone call - goes through silent mode (installing Opsgenie)
- Telegram
- Email

#### Work Hours
The Committee member is required to be on call 24/7. If unavailable on any given day, they must notify the council administrator at least 24 hours in advance. **Days of non-availability are not limited.**

### Code of Conduct
In order to foster a community characterized by respect, inclusivity, and safety, all members SHALL adhere to these principles:
- Active Participation: Expected to engage in discussions and decision-making processes.
- Accessibility: Remain accessible through Starknet community forum.
- Ethical Behavior: Uphold high standards of ethics, integrity, professionalism, and accountability.
- Positive Communication: Contribute to respectful culture of communication.
- Respect and Non-discrimination: Refrain from hate speech, discrimination, and ad hominem attacks.
- Non-Violence: Avoid promoting physical or verbal violent behavior.
- No Abuse of Position: Must not exploit position for undue advantages.
- Conflict of Interests: Declare and withdraw when conflicts arise.
- Confidentiality: Maintain confidentiality of sensitive discussions.

### Removal Conditions
The Starknet Foundation SHALL manage appointments and removals from the Monetary Council from an administrative perspective. Members SHALL only be removed for:
- Conflict of Interest: Involvement in activities compromising impartial decision-making.
- Lack of Participation: Failure to meet attendance and voting expectations.
- Security Breach or Misconduct: Unethical behavior or security breach violations.
- Change in Expertise Requirements: No longer possessing required technical knowledge.
- Loss of Community Trust: Loss of confidence due to poor decision-making or actions.

## Rationale
The Monetary Committee structure reflects careful consideration of governance needs and community feedback. The initial four-member structure provides a balanced starting point that may evolve over time. This number, combined with the 75% consensus requirement, ensures both security and operational efficiency. Member selection by the Starknet Foundation follows clear eligibility criteria, including technical competency and organizational diversity, with formal KYC/KYB verification through official providers. All committee decisions will be documented and shared publicly to maintain transparency. This structure was established following community approval through the [staking vote](https://governance.starknet.io/voting-proposals/5), ensuring alignment with Starknet's governance principles while enabling effective monetary parameter management.

## Security Considerations
The key security considerations for the Monetary Committee center on implementation and technical risks. It is crucial to ensure that the smart contracts involved in parameter management operations, particularly the multi-sig implementation and token admin contract interactions, are secure and free from vulnerabilities. To mitigate these risks, all critical code MUST be audited and/or formally verified. Regular security assessments and established verification processes must be maintained to ensure the continued integrity of the Committee's operations.

## History
Initial version of the Monetary Committee Charter SNIP.

## Copyright
Copyright and related rights waived via [MIT](../LICENSE).