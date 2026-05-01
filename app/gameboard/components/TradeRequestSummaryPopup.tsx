import { GameEventDTO, Player, Resources } from "../types";
import { resourceEmojiByType, resourceTypes } from "../constants";
import styles from "@/styles/gameboard.module.css";

export interface TradeRequestSummaryEntry {
	playerId: number;
	playerName: string;
	status: "PENDING" | "ACCEPTED" | "DENIED";
}

interface TradeRequestSummaryPopupProps {
	isVisible: boolean;
	tradeRequest: GameEventDTO | null;
	currentPlayer: Player | null;
	sourcePlayer: Player | null;
	responses: TradeRequestSummaryEntry[];
	onFinalizeTrade: (targetPlayerId: number) => void;
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

export function TradeRequestSummaryPopup({
	isVisible,
	tradeRequest,
	currentPlayer,
	sourcePlayer,
	responses,
	onFinalizeTrade,
	onClose,
}: TradeRequestSummaryPopupProps) {
	if (!isVisible || !tradeRequest || !sourcePlayer || currentPlayer?.id !== sourcePlayer.id) {
		return null;
	}

	const giveResources = tradeRequest.giveResources ?? createZeroResources();
	const receiveResources = tradeRequest.receiveResources ?? createZeroResources();
	const acceptedResponses = responses.filter((response) => response.status === "ACCEPTED");

	const statusLabelByResponse: Record<TradeRequestSummaryEntry["status"], string> = {
		PENDING: "Pending",
		ACCEPTED: "Accepted",
		DENIED: "Denied",
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
					Choose one player who accepted. Pending and denied responses are shown for reference.
					Offer {formatResources(giveResources)} for {formatResources(receiveResources)}.
				</p>

				<div className={styles.tradeResponseList}>
					{responses.map((response) => {
						const isAccepted = response.status === "ACCEPTED";
						return (
							<div key={`response-${response.playerId}`} className={styles.tradeResponseRow}>
								<div className={styles.tradeResponsePlayerName}>{response.playerName}</div>
								<span className={styles.tradeResponseStatus} data-status={response.status}>
									{statusLabelByResponse[response.status]}
								</span>
								<button
									type="button"
									className={styles.tradeResponseActionButton}
									onClick={() => onFinalizeTrade(response.playerId)}
									disabled={!isAccepted}
								>
									Trade with {response.playerName}
								</button>
							</div>
						);
					})}
				</div>

				{acceptedResponses.length === 0 ? (
					<div className={styles.tradeResponseEmptyState}>No players have accepted yet.</div>
				) : null}
			</div>
		</div>
	);
}
