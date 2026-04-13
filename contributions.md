# Contributions

Every member has to complete at least 2 meaningful tasks per week, where a
single development task should have a granularity of 0.5-1 day. The completed
tasks have to be shown in the weekly TA meetings. You have one "Joker" to miss
one weekly TA meeting and another "Joker" to once skip continuous progress over
the remaining weeks of the course. Please note that you cannot make up for
"missed" continuous progress, but you can "work ahead" by completing twice the
amount of work in one week to skip progress on a subsequent week without using
your "Joker". Please communicate your planning **ahead of time**.

Note: If a team member fails to show continuous progress after using their
Joker, they will individually fail the overall course (unless there is a valid
reason).

**You MUST**:

- Have two meaningful contributions per week.

**You CAN**:

- Have more than one commit per contribution.
- Have more than two contributions per week.
- Link issues to contributions descriptions for better traceability.

**You CANNOT**:

- Link the same commit more than once.
- Use a commit authored by another GitHub user.

---

## Contributions Week 1 - [18.03.] to [01.04.]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **@Gresay** | 24.03. | https://github.com/Lime556/sopra-fs26-group-11-server/commit/16e79d227b4f9f8db841d0f41466ce736258d81a | Static gameboard Description(#96)| Having a baselayer for the game to be implemented on |
|                    | 24.03. | https://github.com/Lime556/sopra-fs26-group-11-server/commit/2bc1e58d112cbd625750ea20aaaae5a83d9aa3be | Numbering values of boardstate(#97) | Giving context for each hexagon for later dice action |
| **@ayleenmr** | 28.03.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/0e6d5701b75b24df50fa7e0605f5cb70e1150a41#diff-d2ddb22581eade88ed6c44d09735a2127cc51719a53aa0cbdb4238fe7c15f932 https://github.com/Lime556/sopra-fs26-group-11-client/commit/81a68682187c11404716ca76dd30d9a9172ef956 | Implemented Login UI (#7), added login functionality (#36) in the backend and added test coverage. | As part of user story 2, it is essential for users to be able to log in via the login interface, so that they can play the game. |
|                    | 31.03.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/2bccff6b0073e051680d6cf02f486d5dd39795de https://github.com/Lime556/sopra-fs26-group-11-server/commit/5e08b75bc03e590d80087991ccb87c91595c75ab | Implemented logout functionality (#39) and added test coverage (#44). | As part of user story 2, users need to be able to log out of their accounts. This ensures that tokens are handled correctly and authentication is ensured. |                   
| **@Ziske11** | 29.03.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/b3813dda3d87de7e9f637bb48b5584b27e549be2 | Added Lobby creation functionality | We need to be able to join a lobyy to even start a Game |
|                    | 29.03.  | https://github.com/Lime556/sopra-fs26-group-11-server/commit/f0b61d609ff77d36269c782cb2ceb356be5082dd | Added lobby persistance to database | We want to be able to add lobbies to a database, so that we can keep track of all lobbies and players can join a chosen lobby and play a game |
|                    | 31.03.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/2bccff6b0073e051680d6cf02f486d5dd39795de https://github.com/Lime556/sopra-fs26-group-11-server/commit/5e08b75bc03e590d80087991ccb87c91595c75ab | Implemented logout functionality (#39) and added test coverage (#44). | As part of user story 2, users need to be able to log out of their accounts. This ensures that tokens are handled correctly and authentication is ensured. |    
| **@CaroAW** | 29.03.   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/217/changes/954e541a7c39a50e9fbd02d56499146ab91e975f | Implement lobby join functionality (#66) | A functional lobby is a big part of our game. It is the whole purpose of the game to be able to play with other, so a lobby is needed to join others. |
|                    | 29.03.   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/217/changes/954e541a7c39a50e9fbd02d56499146ab91e975f | Validate lobby capacity and handle join errors (#67) | There is a fixed amount of players in one game and that capacity must be validated. Join errors must occur in certeain instances. |
| **@Lime556** | 26.03   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/a06a83124d352af324a3a318dc7e9b6fe2913df8 | Create POST /users endpoint to handle user registration requests (#29) | [Why this contribution is relevant] |
|                    | 27.3   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/99b4fc200b64c5d7d4ea1408c6c12673f0f6ac21 | Validate input (username, password) and store new user in the database (#30) | [Why this contribution is relevant] |
|                    | 27.3   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/506379b7ca6a8faad9b272f4e383b2f8b50e3824 | Automatically authenticate user after successful registration (#31) | [Why this contribution is relevant] |
|                    | 29.3   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/a8df270dc7f9da492e5704e2774613a07f87e27f | Create registration form with input fields (#4) | [Why this contribution is relevant] |
|                    | 29.3   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/de26fe3b6d37da1f6bee9e3ebc088f701db0accc | Send registration request to backend and handle response (#4) | [Why this contribution is relevant] |
|                    | 29.3   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/b24cbdb767a036cf4945145d753b3d88b8273030 | Handle registration errors and feedback in UI (#6) | [Why this contribution is relevant] |
|                    | 31.3   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/552d804538112b332173ce6ff4bed1a82813507e | Add email functionality, as well as register page redesign (#51) | [Why this contribution is relevant] |

---

## Contributions Week 2 - [02.04] to [15.04.]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **ayleenmr** | 03.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/69debaac5e936e0b60e772dec25f37e4ecf9377e | Implemented lobby search logic (#72), error handling (#73) and added tests (#74). | Players need to be able to find a desired lobby in order to play the game. |
|                    |  03.04.  | https://github.com/Lime556/sopra-fs26-group-11-client/commit/cbe6ea7f16c4064ad24a02b244c53070248482d3 | Formatted the landing page to match our application (#63). | Players can see immediately what game they will log into and which group developed it. |
|                    |  10.04.  | https://github.com/Lime556/sopra-fs26-group-11-client/commit/ae43fca865db9910b4a3c15b404a1c72f119e168 | Added lobby search bar and button (#21). The search request and possible errors are handled correctly (#22) and the results are displayed (#23). | Players need to be able to search for a lobby so that they can join it. |
| **@Gresay**        | 07.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/cf608e52159ce43eeb294a9fac78338cac8f47d3 | Boardgame storrage as well as support for the frontend design with boat(#98,#99,#101,#102) and robber| Support frontend as well as crutials game components |
|                    | 07.04.   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/65de378aa394b2071290ade774354273d9c66335 | Boardgame UI frontend #30 | First visual part of the imlemention of the game. |
| **[@githubUser3]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |

---

## Contributions Week 3 - [Begin Date] to [End Date]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **[@githubUser1]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser2]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser3]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |

---

## Contributions Week 4 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 5 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 6 - [Begin Date] to [End Date]

_Continue with the same table format as above._
