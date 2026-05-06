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
|                    | 13.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/235/changes/eed333a188156dcc69e96a697dcf5d636bfa47ea | implemented victory points backend (#158,#159,#160,#161,#163) | Vp are the goal of the game |
| **Ziske11** | 7.4.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/06cf783a6934ac280d1c9376e510f9a68eb1c8c3 | Added Lobby Creation UI and display actual Lobbys in Main Page (#17, #18) | We need the Lobbys to be displayed in the UI to be able to Join a game. |
|                    | 7.4.   | (https://github.com/Lime556/sopra-fs26-group-11-server/commit/f7923ef39c317b23cfc47e7fc35ba9d395f34469) | Corrected and Completed Lobby Test functionality (Already added in my other Commit, not in this one) | We want to be able to test the Lobby Functionality. |
| **CaroAW** | [14.04]   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/237/changes/6b0b684b538415c65472a2f89e174a0244cfe888 | Synchronize lobby states for all players(#70) | So that the lobby is always updated and that you don't have to manualy refresh the window every time |
|                    | [14.04]   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/237/changes/8aac9f7ac56b726662fe9c43646bfbef78dc0b78 | Test lobby join flow (#71) | So that we don't have to test everything by trial and error. |
|                    | [14.04]   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/493aa2cbff35f164f936efbfd726b17f3f289f32 | Create lobby list UI with player count (S6, #19) | [Why this contribution is relevant] |
|                    | [14.04]   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/8fba1acddc939d098d9de088e2b0ceb453d3052a | Implement joining a lobby from the UI (S6, #20) | [Why this contribution is relevant] |
| **@Lime556** | [05.04.] | https://github.com/Lime556/sopra-fs26-group-11-server/commit/eeaae7ae61151d31cfd023d679024886d55fd1cd | Validate host permissions, lobby membership, and player count before game start (#85) | This ensures that a game can only start when the requesting user is actually part of the lobby, has host privileges, and the required minimum number of participants has been reached. |
|                | [06.04.] | https://github.com/Lime556/sopra-fs26-group-11-server/commit/9a2650afe2f31fb8b214f2a54983437b1d39ab42 | Create Player entities with initial color and victory points when starting a game (#86) | This initializes the game correctly by transforming lobby participants into actual game players with the required starting state. |
|                | [08.04.] | https://github.com/Lime556/sopra-fs26-group-11-server/commit/8a57a5b1994679c1d0a0ff29541b64ebaebd24a7 | Expose start game API returning game ID (#84) | This allows the frontend to trigger game creation and redirect players to the correct game once the lobby starts. |
|                | [08.04.] | https://github.com/Lime556/sopra-fs26-group-11-server/commit/6de365388ad3f11e8a934c839e37039873734b88 | Expose hostId and gameId in lobby response (#84) | This gives the frontend the information needed to determine who may start the game and whether a lobby has already transitioned into a running game. |
|                | [08.04.] | https://github.com/Lime556/sopra-fs26-group-11-server/commit/43c99b0e00ba9e7ddd97609d9c6e6adfe6f4049a | Add name and private status to lobby API responses (#84) | This improves lobby visibility and usability in the frontend by showing clearer lobby information and whether a password is required. |
|                | [13.04.] | https://github.com/Lime556/sopra-fs26-group-11-server/commit/efb5360e15e5e348b7e9fd2a81680a22d259f84f | Model lobby participants in backend and expose them via DTOs (#234) | This establishes a cleaner and more accurate lobby model by distinguishing lobby participation from in-game player state, which is essential for the lobby room and later game transition logic. |
|                | [13.04.] | https://github.com/Lime556/sopra-fs26-group-11-client/commit/f8e581904c74199e98506a83179e770d181bd722 | Add lobby room page with participant list and host start control, as well as a small change to auth logic (#26) | This provides the frontend room view where participants are displayed and gives the host the UI control needed to start the game. |
|                | [14.04.] | https://github.com/Lime556/sopra-fs26-group-11-client/commit/2beb7bd6c958f49ae0950867fda58175834c1c41 | Sync lobby room and auto-redirect players when game starts (#27) | This ensures that all players in the lobby are automatically kept in sync and redirected into the game once the host starts the session. |
---

## Contributions Week 3 - [16.04.] to [22.04.]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **Ziske11** | 20.4.   | (https://github.com/Lime556/sopra-fs26-group-11-server/commit/b48f7802e106f27c3303158d0f768122f8cc4f54) | Added full Lobby Host functionality, kicking out players, transferring Lobby host, leaving and closing Lobbies | to be able to leave and join Lobbys and the giving the Lobby host permission to kick out players or assign them as the Lobby host.|
|                    | 20.4.   | (https://github.com/Lime556/sopra-fs26-group-11-client/commit/a7b50499382f8a5f367e7febc11a6cba32be7c2c) | Added User Interface for the lobby, players in right order, Host and Myself tag on relevant players, transfer Host&Kick Player Buttons and temporary Messages| We need the buttons to be able to execute those commands, and the messages are important to follow what happens, if someone kicked anotherone out, or the host closed the lobby. |
| **Gresay** | 17.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/1b17074f854524132dbf91989756f3cf180f6cf1 | Synchronize turn state across players.(#115,#112,#113) | Knowing what others are doing and updating the board for all the same is neccesary for the game to be played |
|                    | 17.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/c217e18fc9f127781a95d69a985b19de371efe32 | Road builing backend and longestroad. #78 | One step to get victory points is to build houses sonnectrd with roads. longest road is an additional way to get VPs to play the game and win. |
|                    | 21.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/c613b4234e3235de407eb876117d14d0262bb145 | Implement dev card purchase logic (#149#150,#151,152,#153,#154,#155,#157) |
| | 21.04.|https://github.com/Lime556/sopra-fs26-group-11-server/commit/75a93e48ae6038695813da02cc25d44599697f1e| Testing development cards.#157| Testing is important for code quaity|
| | 21.04.|https://github.com/Lime556/sopra-fs26-group-11-client/commit/37fe3ca3d0dcdde1033fb8d7e3245251c6148006| Implementes Developmentcard frontend in an not final from for MVP.#149#150,#151,152,#153,#154,#155| Implementation in the backend is nothing without any frontend support for Testin live without any rough design|
| **ayleenmr** | 19.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/65af64ecacbdb93fb4c1838f6b6c3416548c5172 | Implemented turn phase logic in the backend and added tests (#110 #111 #116). | In order to play the game in a fair way, the turn phases have to include dice rolling, action and ending the turn. |
|                    | 19.04.   | https://github.com/Lime556/sopra-fs26-group-11-client/commit/a640545047347e7e3b9936020132db1e63803537 | Turn phases are now handled correctly in the frontend (#32). | The disabled buttons help to guide the players and prevent unnecessary calls to the backend. |
|                    | 21.04.   | https://github.com/Lime556/sopra-fs26-group-11-server/commit/150243bd34282efd75099b12f40794258ca23b6a | Started working on the backend logic of the setup phase ( #103 #104 #105 #106 #107 #109). | The setup phase is necessary to start playing the game in a structured way. The reverse-order of turns after the first round ensures fairness among the players. |
| **CaroAW** | 21.04.26   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/253/changes/7c406ebdde37474d425d5271620901173b639f8e | implement dice roll logic | rolling the dice is a big part of this game to distribute the resources |
|                    | 21.04.26   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/253/changes/f75c7170b584053378ab5d329701560c23432130 | distribute resources based on dice result | to build in catan you have to have resources |
|                    | 21.04.26   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/253/changes/31dffcd144f50d1733f03ba6c0607df133ec6dac | Synchronize dice roll for all players | for a good gaming experience being up to date is very important, thats why synchronization matters |
|                    | 21.04.26   | https://github.com/Lime556/sopra-fs26-group-11-server/pull/253/changes/6241e1873e4721c12d34b2e652cea1db1c596bdd | Restrict dice roll to active player and correct phase | So that nothing that isn't allowed can happen |
| **@Lime556** | 15.04. | https://github.com/Lime556/sopra-fs26-group-11-server/commit/f5782838ad9b9dff7f83f251fc581b7a8be384a2 | refactor(lobby): model host and membership via LobbyParticipant (#234) | This improves the lobby domain model by separating host and membership logic through LobbyParticipant, which is important for correct lobby behavior and future game transitions. |
|                    | 15.04. | https://github.com/Lime556/sopra-fs26-group-11-server/commit/ea3cb929aac40685c2506e74aa16fb20cb7fd1c7 | test(lobby): update backend tests for participant-based lobby model (#234) | This updates the backend test suite to the participant-based lobby model and ensures the refactored lobby logic works correctly and remains stable. |
|                    | 15.04. | https://github.com/Lime556/sopra-fs26-group-11-client/commit/f2ffebd44bdf15c54206a9fce2488715de293a3b | sync lobby pages with participant-based host model (#27) | This aligns the frontend lobby pages with the updated backend participant-based host structure so that lobby state, roles, and transitions are displayed correctly. |
|                    | 20.04. | https://github.com/Lime556/sopra-fs26-group-11-server/commit/d43687d523fd2210c22ef54ae15feed788987c57 | Redesign board graph and add baseline building and adapt longest road logic to new design (#123) | This introduces the new board graph structure needed for building placement and updates longest road logic so it remains consistent with the redesigned board representation. |
|                    | 20.04. | https://github.com/Lime556/sopra-fs26-group-11-server/commit/227f86c1e8becfa3e22dd5f133fe6c2d405ac919 | Validate legal building positions and add building tests (#124, #128) | This verifies that buildings can only be placed on valid positions on the board and adds tests to prevent illegal placement regressions. |
|                    | 20.04. | https://github.com/Lime556/sopra-fs26-group-11-server/commit/1a2fefb3fe797e1c0119f10cf2bf40440b96b613 | Validate legal road and settlement placement and add tests (#124, #128) | This ensures that road and settlement placement follows the game rules and strengthens reliability by adding backend test coverage for the placement validation logic. |
|                    | 20.04. | https://github.com/Lime556/sopra-fs26-group-11-client/commit/6210f1dc35b5d3fb40a31d20a34fc91303af5d04 | Implement interactive gameboard placement flow for roads, settlements, and cities with local debug support and UI hover cost overlays (#34) | This adds the interactive frontend placement flow for core building actions on the gameboard and enables efficient local testing through debug support and clearer UI feedback. |

---

## Contributions Week 4 - [22.04.] to [06.05.]

| **Student**        | **Date** | **Link to Commit** | **Description**                 | **Relevance**                       |
| ------------------ | -------- | ------------------ | ------------------------------- | ----------------------------------- |
| **Gresay** | 27.04.   | https://github.com/Lime556/sopra-fs26-group-11-client/pull/100/changes/78d0f318f59069f8016569405accbbab47be3857 | Ressources from Bank get deducted and added it they are spent and rolled.(#266) | The ressources are limmited and need to be trackable. |
|           | 27.04.  | https://github.com/Lime556/sopra-fs26-group-11-server/pull/267/changes/f693724a102948241012db654b4b84c0fbe48677 | (#266) Backend Bank interactions | Bank ressources need to be presistant |
|                    | 28.04.   | https://github.com/Lime556/sopra-fs26-group-11-client/pull/100/changes/bac1e71eb4aa989fe808cddffbe0593367922775 |(#129,#164 ,#130) Trading interfaces updated | Trading is a relevant part of the strategy and an interface is needed to do the acton |
| | 28.04.| https://github.com/Lime556/sopra-fs26-group-11-server/pull/267/changes/e612a556c6a54dd6be0fce7487a75796037d6fc1 | ( #129 , #164 , #130) Trading logic and validation | TRading needs to be verified so everithing goes fairly accordintg to the rules.|
|             | 29.04,    | https://github.com/Lime556/sopra-fs26-group-11-client/pull/100/changes/13189368e5c55db11b75091255cf8280d6ef2ae4| (#131,#132,#133, #35) Player trading fixxed| Trading needs to be functional |
| | 29.04 | https://github.com/Lime556/sopra-fs26-group-11-server/pull/267/changes/65c3251394de748f929b7ed36becf3cbbe4227fe | (#131, #132, #133) Player tradig backend controll and synchroisation. | HAvin synchronized TRading makes shure noone is abusing the system.| 
|              |30.04.  | https://github.com/Lime556/sopra-fs26-group-11-client/pull/100/changes/7683400d4cbf7743a5498c7276265620bd778bb9 | #64, Bank trade interface | when players dont want to trade somtimes the bank is the only option. |
| | 30.04. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/267/changes/1951c77c3b05abbd914344908220307684acafa9 | ( #171 #172 #173 #174 #175 #177) TRading with the bank backend.| having everything backend synchronised saves from abuse.|
|            | 31.04.  | https://github.com/Lime556/sopra-fs26-group-11-client/pull/100/changes/5f3d8f891ca00803af2e64ef8b0fd7b356c30b21 | (#38) Interfaceds for Year of plenty and Monopoly dev cards. | HAving an interface is needed to effecifly using the cards.|
| **[@githubUser2]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser3]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |
| **@Lime556** | 29.04. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/268/changes/29f56274f20e745d9d8d46a5abf9daada66db922 | Add friend request and friendship data model (#45) | This introduces the backend persistence model for friend requests and friendships, which is required before users can send requests, accept them, and maintain a friend list. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/268/changes/3420f7d92b38c8623b3a0cb7f6455c2e5461a8d7 | Implement send friend request endpoint (#46) | This allows authenticated users to send friend requests to other users through the backend API, making the friend system usable beyond the database model. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/268/changes/8d627feeec0974fda468da333ee17ffbcd3c08ab | Implement accept and decline friend request logic (#47) | This completes the core friend request flow by letting receivers accept or decline pending requests and by creating friendships when requests are accepted. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/268/changes/fd5ba7632deef406d1063c4d1095112ab3b90f21 | Implement friend list retrieval with status (#48) | This lets users retrieve their current friends and see their user status, which is necessary for displaying a functional friend list in the frontend. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/268/changes/d3fecff31952ed51ffb7ad1e483603ba21d01855 | Track user status and reuse UserService authentication in GameService (#49) | This improves consistency by using the shared authentication logic and keeping user status available for friend-related features and game service access control. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/268/changes/d21a3ff55c561df9893253199ee00fd26da941a0 | Add friend service and controller coverage and update affected game tests (#53) | This adds backend test coverage for the friend feature and adapts existing GameService and TurnSystem tests to the updated authentication behavior, helping keep the backend stable after the friend system changes. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-server/pull/268/changes/e92fd25fc88352eefa8f46e6ef1cdc8b9c73abc7 | Add friend request retrieval endpoint and tests (#46, #53) | This adds the missing endpoint for retrieving pending friend requests and verifies it with tests, so the frontend can display incoming requests from real backend data. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-client/pull/102/changes/87234286de4ec72da3e00f847a3fe08239207ddf | Mark friend UI task as already completed (#11) | This documents that the friend request and friend list UI had already been completed in earlier frontend work and links the completed work to the correct task for traceability. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-client/pull/102/changes/ac8dc421866baf79adec364830cb5d11d83ee5c4 | Connect friend features to backend API (#12) | This replaces mock friend data with real backend calls for loading friends, retrieving pending requests, searching users, sending requests, and accepting or declining them. |
|                    | 02.05. | https://github.com/Lime556/sopra-fs26-group-11-client/pull/102/changes/f570666220f6b1d9f53fd8ad9077955e47e26d53 | Add manual friend refresh button (#13) | This gives users a lightweight way to refresh friends and pending requests without constantly polling the backend, which keeps the feature usable while avoiding unnecessary network traffic. |


---

## Contributions Week 5 - [Begin Date] to [End Date]

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
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |


---

## Contributions Week 6 - [Begin Date] to [End Date]

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
| **[@githubUser4]** | [date]   | [Link to Commit 1] | [Brief description of the task] | [Why this contribution is relevant] |
|                    | [date]   | [Link to Commit 2] | [Brief description of the task] | [Why this contribution is relevant] |

