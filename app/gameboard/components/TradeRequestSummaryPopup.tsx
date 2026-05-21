import { useEffect, useMemo, useState } from "react";
import { GameEventDTO, Player, Resources } from "../types";
import { resourceEmojiByType, resourceTypes } from "../constants";
import styles from "@/styles/gameboard.module.css";

export interface TradeRequestSummaryEntry {
	playerId: number;
	playerName: string;
	status: "PENDING" | "ACCEPTED" | "DENIED" | "COUNTEROFFER";
	counterOffer?: Resources;
	counterRequest?: Resources;
}

interface TradeRequestSummaryPopupProps {
	isVisible: boolean;
	tradeRequest: GameEventDTO | null;
	currentPlayer: Player | null;
	sourcePlayer: Player | null;
	responses: TradeRequestSummaryEntry[];
	onFinalizeTrade: (targetPlayerId: number, isCounter?: boolean) => void;
	onDenyCounteroffer: (targetPlayerId: number) => void;
	onClose: () => void;
}

const createZeroResources = (): Resources => ({
	wood: 0,
	brick: 0,
	wool: 0,
	wheat: 0,
	ore: 0,
});

const formatResources = (bundle: Partial<Resources> | undefined): string => {
	const normalized = { ...createZeroResources(), ...(bundle ?? {}) };
	const parts = resourceTypes
		.filter((resource) => (normalized[resource] ?? 0) > 0)
		.map((resource) => `${resourceEmojiByType[resource]} ${normalized[resource]} ${resource === "wool" ? "sheep" : resource}`);
	return parts.length > 0 ? parts.join(" + ") : "nothing";
};

interface SelectedTradePartner {
	playerId: number;
	isCounter: boolean;
	key: string;
}

export function TradeRequestSummaryPopup({
	isVisible,
	tradeRequest,
	currentPlayer,
	sourcePlayer,
	responses,
	onFinalizeTrade,
	onDenyCounteroffer,
	onClose,
}: TradeRequestSummaryPopupProps) {
	const selectableTrades = useMemo<SelectedTradePartner[]>(() => {
		return responses.flatMap((response) => {
			const hasCounterData = !!response.counterOffer && !!response.counterRequest;
			const trades: SelectedTradePartner[] = [];

			if (response.status === "ACCEPTED" || response.status === "COUNTEROFFER" || (response.status === "DENIED" && hasCounterData)) {
				trades.push({
					playerId: response.playerId,
					isCounter: false,
					key: `${response.playerId}-original`,
				});
			}

			if (response.status === "COUNTEROFFER") {
				trades.push({
					playerId: response.playerId,
					isCounter: true,
					key: `${response.playerId}-counter`,
				});
			}

			return trades;
		});
	}, [responses]);
	const [selectedTrade, setSelectedTrade] = useState<SelectedTradePartner | null>(null);

	useEffect(() => {
		setSelectedTrade((previous) => {
			if (selectableTrades.length === 0) {
				return null;
			}

			if (previous && selectableTrades.some((trade) => trade.key === previous.key)) {
				return previous;
			}

			return selectableTrades[0];
		});
	}, [selectableTrades, tradeRequest?.tradeRequestId]);

	if (!isVisible || !tradeRequest || !sourcePlayer || currentPlayer?.id !== sourcePlayer.id) {
		return null;
	}

	const giveResources = tradeRequest.giveResources ?? createZeroResources();
	const receiveResources = tradeRequest.receiveResources ?? createZeroResources();
	const actionableResponses = responses.filter((response) =>
		response.status === "ACCEPTED" ||
		response.status === "COUNTEROFFER" ||
		(response.status === "DENIED" && !!response.counterOffer && !!response.counterRequest)
	);

	const statusLabelByResponse: Record<string, string> = {
		PENDING: "Pending",
		ACCEPTED: "Accepted",
		DENIED: "Denied",
		COUNTEROFFER: "Counteroffer",
	};

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.tradeRequestSummaryModal}>
				<div className={styles.tradeRequestHeader}>
					<h2 className={styles.tradeModalTitle}>Trade Responses</h2>
					<button type="button" className={styles.tradeCloseButton} onClick={onClose}>
						✕
					</button>
				</div>

				<div className={styles.tradeRequestMeta}>
					<div>
						<strong>From:</strong> {sourcePlayer.name}
					</div>
					<div>
						<strong>Broadcast to:</strong> All players
					</div>
				</div>

				<div className={styles.tradeRequestBody}>
					<div className={styles.tradeRequestSection}>
						<div className={styles.tradeRequestSectionTitle}>You offer</div>
						<div className={styles.tradeRequestResourceList}>
							{resourceTypes.map((resource) => (
								<span key={`summary-offer-${resource}`} className={styles.tradeRequestResourceChip}>
									{resourceEmojiByType[resource]} {giveResources[resource] ?? 0}
								</span>
							))}
						</div>
					</div>

					<div className={styles.tradeRequestSection}>
						<div className={styles.tradeRequestSectionTitle}>You request</div>
						<div className={styles.tradeRequestResourceList}>
							{resourceTypes.map((resource) => (
								<span key={`summary-want-${resource}`} className={styles.tradeRequestResourceChip}>
									{resourceEmojiByType[resource]} {receiveResources[resource] ?? 0}
								</span>
							))}
						</div>
					</div>
				</div>

				<p className={styles.tradeRequestNote}>
					Choose one accepted player, then complete the trade. Pending and denied responses are shown for reference.
					Offer {formatResources(giveResources)} for {formatResources(receiveResources)}.
				</p>

				<div className={styles.tradeResponseList}>
					{responses.map((response) => {
						const hasCounterData = !!response.counterOffer && !!response.counterRequest;
						const isCounterStatus = response.status === "COUNTEROFFER";
						// A response is actionable if it's ACCEPTED, or if it's a COUNTEROFFER,
						// or if it was a DENIED counteroffer (meaning the original trade is still an option).
						const isActionable = response.status === "ACCEPTED" || isCounterStatus || (response.status === "DENIED" && hasCounterData);
						const originalSelectionKey = `${response.playerId}-original`;
						const counterSelectionKey = `${response.playerId}-counter`;
						const isOriginalSelected = selectedTrade?.key === originalSelectionKey;
						const isCounterSelected = selectedTrade?.key === counterSelectionKey;
						const statusColor = isCounterStatus ? "#eab308" : undefined;

						return (
							<div
								key={`response-${response.playerId}`}
								className={`${styles.tradeResponseRow} ${isOriginalSelected || isCounterSelected ? styles.tradeResponseRowSelected : ""}`}
							>
								<div className={styles.tradeResponseInfo} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
									<div className={styles.tradeResponsePlayerName}>{response.playerName}</div>
									<span 
										className={styles.tradeResponseStatus} 
										data-status={response.status}
										style={statusColor ? { color: statusColor, borderColor: statusColor } : undefined}
									>
										{statusLabelByResponse[response.status]}
									</span>
									{hasCounterData && response.counterOffer && response.counterRequest && (
										<div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#fefce8", borderRadius: "4px", border: "1px solid #fef08a" }}>
											<div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#854d0e", marginBottom: "4px" }}>PLAYER COUNTEROFFER:</div>
											<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
												<div style={{ fontSize: "0.8rem" }}>
													<strong>Gives:</strong> {resourceTypes.filter(r => (response.counterOffer?.[r] ?? 0) > 0).map(r => `${resourceEmojiByType[r]} ${response.counterOffer?.[r]}`).join(", ") || "nothing"}
												</div>
												<div style={{ fontSize: "0.8rem" }}>
													<strong>Wants:</strong> {resourceTypes.filter(r => (response.counterRequest?.[r] ?? 0) > 0).map(r => `${resourceEmojiByType[r]} ${response.counterRequest?.[r]}`).join(", ") || "nothing"}
												</div>
											</div>
										</div>
									)}
								</div>
								<div style={{ display: "flex", gap: "8px", flexDirection: "column", alignItems: "flex-end" }}>
									<div style={{ display: "flex", gap: "8px" }}>
										{isActionable && (
											<button
												type="button"
												className={styles.tradeResponseActionButton}
												data-selected={isOriginalSelected}
												onClick={() => setSelectedTrade({ playerId: response.playerId, isCounter: false, key: originalSelectionKey })}
											>
												{isOriginalSelected ? "Selected" : isCounterStatus ? "Select Original" : `Select ${response.playerName}`}
											</button>
										)}
										{isCounterStatus && (
											<button
												type="button"
												className={styles.tradeResponseActionButton}
												data-selected={isCounterSelected}
												onClick={() => setSelectedTrade({ playerId: response.playerId, isCounter: true, key: counterSelectionKey })}
												style={{ backgroundColor: isCounterSelected ? "#7c5d04" : "#eab308", border: "1px solid #ca8a04" }}
											>
												{isCounterSelected ? "Counter Selected" : "Select Counter"}
											</button>
										)}
									</div>
									{isCounterStatus && (
										<button
											type="button"
											className={styles.tradeDeclineButton}
											style={{ padding: "8px 12px", minWidth: "60px" }}
											onClick={() => onDenyCounteroffer(response.playerId)}
										>
											Deny
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{actionableResponses.length === 0 ? (
					<div className={styles.tradeResponseEmptyState}>No players have accepted yet.</div>
				) : null}
				{selectedTrade ? (
					<div className={styles.tradeSummaryActions}>
						<button
							type="button"
							className={styles.tradeActionButton}
							onClick={() => onFinalizeTrade(selectedTrade.playerId, selectedTrade.isCounter)}
						>
							Complete trade with selected player
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}
