"use client";

import React from "react";
import { Mail, Search, UserPlus, Check, X } from "lucide-react";
import styles from "@/styles/lobby.module.css";
import type { Friend } from "@/components/lobby/FriendDetailTab";

export interface FriendRequest {
  id: number;
  userId: string;
  username: string;
  message: string;
  date: string;
}

interface SearchResult {
  id: string;
  username: string;
}

interface FriendsTabProps {
  friends: Friend[];
  friendRequests: FriendRequest[];
  showFriendSearch: boolean;
  showFriendRequests: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  onToggleFriendRequests: () => void;
  onToggleFriendSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSearchFriend: () => void;
  onSendFriendRequest: (userId: string, username: string) => void;
  onAcceptRequest: (requestId: number) => void;
  onDenyRequest: (requestId: number) => void;
  onSelectFriend: (friend: Friend) => void;
}

export default function FriendsTab({
  friends,
  friendRequests,
  showFriendSearch,
  showFriendRequests,
  searchQuery,
  searchResults,
  onToggleFriendRequests,
  onToggleFriendSearch,
  onSearchQueryChange,
  onSearchFriend,
  onSendFriendRequest,
  onAcceptRequest,
  onDenyRequest,
  onSelectFriend,
}: FriendsTabProps) {
  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Friends</h2>
        <div className={styles.headerActions}>
          <button
            onClick={onToggleFriendRequests}
            className={`${styles.secondaryButton} ${styles.badgeButton}`}
          >
            <Mail size={18} />
            Requests ({friendRequests.length})
          </button>

          <button onClick={onToggleFriendSearch} className={styles.successButton}>
            <UserPlus size={18} />
            Add Friend
          </button>
        </div>
      </div>

      {showFriendSearch && (
        <div className={styles.panelBox}>
          <div className={styles.searchRow}>
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search by Player ID (e.g. USR-12345)"
              className={styles.input}
            />
            <button onClick={onSearchFriend} className={styles.primaryButton}>
              Search
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={styles.listColumn}>
              <p className={styles.panelTitle}>Search Results</p>
              {searchResults.map((result) => (
                <div key={result.id} className={styles.resultRow}>
                  <div className={styles.resultInfo}>
                    <div className={styles.avatarSmall}>{result.username[0]}</div>
                    <div>
                      <p className={styles.resultName}>{result.username}</p>
                      <p className={styles.resultMeta}>{result.id}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSendFriendRequest(result.id, result.username)}
                    className={styles.successButton}
                  >
                    <UserPlus size={14} />
                    Send Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showFriendRequests && (
        <div className={styles.panelBox}>
          <p className={styles.panelTitle}>
            Pending Friend Requests ({friendRequests.length})
          </p>

          {friendRequests.length > 0 ? (
            <div className={styles.listColumn}>
              {friendRequests.map((request) => (
                <div key={request.id} className={styles.requestItem}>
                  <div className={styles.requestItemTop}>
                    <div className={styles.avatarSmall}>{request.username[0]}</div>
                    <div>
                      <p className={styles.resultName}>{request.username}</p>
                      <p className={styles.resultMeta}>{request.userId}</p>
                      <p className={styles.requestMessage}>{request.message}</p>
                      <p className={styles.requestDate}>{request.date}</p>
                    </div>
                  </div>

                  <div className={styles.requestActions}>
                    <button
                      onClick={() => onAcceptRequest(request.id)}
                      className={styles.successButton}
                    >
                      <Check size={14} />
                      Accept
                    </button>

                    <button
                      onClick={() => onDenyRequest(request.id)}
                      className={styles.dangerButton}
                    >
                      <X size={14} />
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No pending friend requests</p>
          )}
        </div>
      )}

      <div className={styles.listColumn}>
        {friends.map((friend) => (
          <div
            key={friend.id}
            className={styles.friendCard}
            onClick={() => onSelectFriend(friend)}
          >
            <div className={styles.friendInfo}>
              <div className={styles.avatarSmall}>{friend.name[0]}</div>
              <div>
                <p className={styles.friendName}>{friend.name}</p>
                <p className={styles.friendMeta}>{friend.status}</p>
              </div>
            </div>

            <button
              className={styles.successButton}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Invite
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}