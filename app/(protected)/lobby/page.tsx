"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { LogOut } from "lucide-react";

import LobbySidebar, { TabType } from "@/components/lobby/LobbySidebar";
import LobbiesTab, { LobbyItem } from "@/components/lobby/LobbiesTab";
import PasswordModal from "@/components/lobby/PasswordModal";
import CreateLobbyModal from "@/components/lobby/CreateLobbyModal";
import SettingsTab from "@/components/lobby/SettingsTab";
import HistoryTab from "@/components/lobby/HistoryTab";
import FriendsTab, { FriendRequest } from "@/components/lobby/FriendsTab";
import FriendDetailTab, { Friend } from "@/components/lobby/FriendDetailTab";
import {
  mockFriendRequests,
  mockLobbies,
  mockFriends,
} from "@/components/lobby/mockData";

import styles from "@/styles/lobby.module.css";


export default function Lobby() {
  const apiService = useApi();
  const router = useRouter();

  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { value: userId, clear: clearUserId } = useLocalStorage<string>("userId", "");

  const username = "Player";
  const email = "";
  const playerId = userId ? `USR-${userId}` : "";

  const [activeTab, setActiveTab] = useState<TabType>("lobbies");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<LobbyItem | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  
  // Create Lobby Modal
  const [showCreateLobbyModal, setShowCreateLobbyModal] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState("");
  const [newLobbyIsPrivate, setNewLobbyIsPrivate] = useState(false);
  const [newLobbyPassword, setNewLobbyPassword] = useState("");
  const [createLobbyError, setCreateLobbyError] = useState("");
  
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Mock friend requests
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(mockFriendRequests);
  const [lobbies] = useState<LobbyItem[]>(mockLobbies);
  const [friends] = useState<Friend[]>(mockFriends);

  const handleLogout = async () => {
    try {
      if (userId) {
        await apiService.post("/logout", null);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Logout failed:", error.message);
      } else {
        console.error("Logout failed:", error);
      }
    } finally {
      clearToken();
      clearUserId();
      router.push("/login");
    }
  };

  const handleJoinClick = (lobby: LobbyItem) => {
    if (lobby.isPrivate) {
      setSelectedLobby(lobby);
      setShowPasswordModal(true);
      setPassword("");
      setPasswordError("");
    } else {
      joinLobby(lobby.id);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setPasswordError("Please enter a password");
      return;
    }

    // Mock password validation (in real app, this would be server-side)
    const correctPassword = "catan123"; // Demo password
    if (password === correctPassword) {
      setShowPasswordModal(false);
      if (selectedLobby) {
        joinLobby(selectedLobby.id);
      }
    } else {
      setPasswordError("Incorrect password");
    }
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPassword("");
    setPasswordError("");
    setSelectedLobby(null);
  };

  const joinLobby = (lobbyId: number) => {
    console.log("Joining lobby", lobbyId);
    router.push(`/gameboard?gameId=${lobbyId}`);
  };

  const handleSearchFriend = () => {
    // Mock search results (in real app, this would be API call)
    if (searchQuery.trim()) {
      setSearchResults([
        { id: "USR-12345", username: "NewPlayer" },
        { id: "USR-67890", username: "VeteranGamer" }
      ]);
    }
  };

  const handleSendFriendRequest = (userId: string, username: string) => {
    alert(`Friend request sent to ${username} (${userId})`);
    setShowFriendSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAcceptRequest = (requestId: number) => {
    setFriendRequests(friendRequests.filter(req => req.id !== requestId));
    alert("Friend request accepted!");
  };

  const handleDenyRequest = (requestId: number) => {
    setFriendRequests(friendRequests.filter(req => req.id !== requestId));
    alert("Friend request denied!");
  };

  const handleCreateLobby = () => {
    setShowCreateLobbyModal(true);
    setNewLobbyName("");
    setNewLobbyIsPrivate(false);
    setNewLobbyPassword("");
    setCreateLobbyError("");
  };

  const handleCloseCreateLobbyModal = () => {
    setShowCreateLobbyModal(false);
    setNewLobbyName("");
    setNewLobbyIsPrivate(false);
    setNewLobbyPassword("");
    setCreateLobbyError("");
  };

  const handleCreateLobbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLobbyName.trim()) {
      setCreateLobbyError("Please enter a lobby name");
      return;
    }

    if (newLobbyIsPrivate && !newLobbyPassword.trim()) {
      setCreateLobbyError("Please enter a password for private lobby");
      return;
    }

    // In real app, this would create lobby on backend
    console.log("Creating lobby:", {
      name: newLobbyName,
      isPrivate: newLobbyIsPrivate,
      password: newLobbyPassword
    });

    setShowCreateLobbyModal(false);
    router.push("/gameboard");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "lobbies":
        return (
          <LobbiesTab
            lobbies={lobbies}
            onCreateLobby={handleCreateLobby}
            onJoinLobby={handleJoinClick}
          />
        );

        case "friends":
          if (selectedFriend) {
            return (
              <FriendDetailTab
                friend={selectedFriend}
                onBack={() => setSelectedFriend(null)}
              />
            );
          }
        
          return (
            <FriendsTab
              friends={friends}
              friendRequests={friendRequests}
              showFriendSearch={showFriendSearch}
              showFriendRequests={showFriendRequests}
              searchQuery={searchQuery}
              searchResults={searchResults}
              onToggleFriendRequests={() => setShowFriendRequests(!showFriendRequests)}
              onToggleFriendSearch={() => setShowFriendSearch(!showFriendSearch)}
              onSearchQueryChange={setSearchQuery}
              onSearchFriend={handleSearchFriend}
              onSendFriendRequest={handleSendFriendRequest}
              onAcceptRequest={handleAcceptRequest}
              onDenyRequest={handleDenyRequest}
              onSelectFriend={setSelectedFriend}
            />
          );

        case "settings":
          return (
            <SettingsTab
              username={username}
              email={email}
              playerId={playerId}
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
            />
          );

          case "history":
            return <HistoryTab data={selectedFriend || friends[0]} />;

      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      {/* Background Image */}
      <div className={styles.backgroundOverlay} />

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Settlers of Catan</h1>
          <p className={styles.headerSubtitle}>Welcome, {username}!</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <LogOut size={20} />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        <div className={styles.layout}>

          {/* Left Sidebar - Navigation */}
          <LobbySidebar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Right Content Area */}
          <div className={styles.content}>
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal
          open={showPasswordModal}
          password={password}
          passwordError={passwordError}
          onPasswordChange={setPassword}
          onClose={handleCloseModal}
          onSubmit={handlePasswordSubmit}
        />
      )}

      {/* Create Lobby Modal */}
      {showCreateLobbyModal && (
        <CreateLobbyModal
          open={showCreateLobbyModal}
          newLobbyName={newLobbyName}
          newLobbyIsPrivate={newLobbyIsPrivate}
          newLobbyPassword={newLobbyPassword}
          createLobbyError={createLobbyError}
          onClose={handleCloseCreateLobbyModal}
          onSubmit={handleCreateLobbySubmit}
          onNameChange={setNewLobbyName}
          onPrivateChange={setNewLobbyIsPrivate}
          onPasswordChange={setNewLobbyPassword}
        />
      )}
    </div>
  );
}