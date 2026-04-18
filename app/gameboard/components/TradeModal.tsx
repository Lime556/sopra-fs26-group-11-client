import styles from "@/styles/gameboard.module.css";
import { Player, ResourceType, TradeMode } from "../types";
import { resourceTypes } from "../constants";

interface TradeModalProps {
	isVisible: boolean;
	tradeMode: TradeMode;
	giveResource: ResourceType;
	receiveResource: ResourceType;
	tradeAmount: number;
	targetPlayerId: number | null;
	otherPlayers: Player[];
	currentPlayer: Player | null;
	onClose: () => void;
	onSetTradeMode: (mode: TradeMode) => void;
	onSetGiveResource: (resource: ResourceType) => void;
	onSetReceiveResource: (resource: ResourceType) => void;
	onSetTradeAmount: (amount: number) => void;
	onSetTargetPlayerId: (playerId: number) => void;
	onBankTrade: () => void;
	onPlayerTrade: () => void;
}

export function TradeModal({
	isVisible,
	tradeMode,
	giveResource,
	receiveResource,
	tradeAmount,
	targetPlayerId,
	otherPlayers,
	currentPlayer,
	onClose,
	onSetTradeMode,
	onSetGiveResource,
	onSetReceiveResource,
	onSetTradeAmount,
	onSetTargetPlayerId,
	onBankTrade,
	onPlayerTrade,
}: TradeModalProps) {
	if (!isVisible) {
		return null;
	}

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.tradeModal}>
				<div className={styles.tradeModalHeader}>
					<h2 className={styles.panelTitle}>Trading</h2>
					<button type="button" className={styles.tradeCloseButton} onClick={onClose}>
						Close
					</button>
				</div>

				<div className={styles.tradeRow}>
					<button
						type="button"
						className={`${styles.tradeModeButton} ${tradeMode === "bank" ? styles.tradeModeButtonActive : ""}`}
						onClick={() => onSetTradeMode("bank")}
					>
						Bank
					</button>
					<button
						type="button"
						className={`${styles.tradeModeButton} ${tradeMode === "player" ? styles.tradeModeButtonActive : ""}`}
						onClick={() => onSetTradeMode("player")}
					>
						Player
					</button>
				</div>

				<div className={styles.tradeGrid}>
					<select className={styles.tradeSelect} value={giveResource} onChange={(event) => onSetGiveResource(event.target.value as ResourceType)}>
						{resourceTypes.map((resource) => (
							<option key={`give-${resource}`} value={resource}>
								Give: {resource}
							</option>
						))}
					</select>
					<select className={styles.tradeSelect} value={receiveResource} onChange={(event) => onSetReceiveResource(event.target.value as ResourceType)}>
						{resourceTypes.map((resource) => (
							<option key={`receive-${resource}`} value={resource}>
								Receive: {resource}
							</option>
						))}
					</select>
					<input
						className={styles.tradeInput}
						type="number"
						min={1}
						value={tradeAmount}
						onChange={(event) => onSetTradeAmount(Math.max(1, Number(event.target.value) || 1))}
					/>
					{tradeMode === "player" ? (
						<select
							className={styles.tradeSelect}
							value={targetPlayerId ?? ""}
							onChange={(event) => onSetTargetPlayerId(Number(event.target.value))}
						>
							{otherPlayers.map((player) => (
								<option key={`target-${player.id}`} value={player.id}>
									{player.name}
								</option>
							))}
						</select>
					) : null}
				</div>

				<button
					type="button"
					className={styles.tradeActionButton}
					onClick={tradeMode === "bank" ? onBankTrade : onPlayerTrade}
					disabled={!currentPlayer || (tradeMode === "player" && otherPlayers.length === 0)}
				>
					{tradeMode === "bank" ? "Execute Bank Trade (4:1)" : "Execute Player Trade (1:1)"}
				</button>
			</div>
		</div>
	);
}
