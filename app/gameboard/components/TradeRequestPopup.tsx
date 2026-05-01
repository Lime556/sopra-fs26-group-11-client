import { GameEventDTO, Player, Resources } from "../types";
import { resourceEmojiByType, resourceTypes } from "../constants";
import styles from "@/styles/gameboard.module.css";

interface TradeRequestPopupProps {
	isVisible: boolean;
	tradeRequest: GameEventDTO | null;
	currentPlayer: Player | null;
	sourcePlayer: Player | null;
	onAccept: () => void;
	onDeny: () => void;
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

export function TradeRequestPopup({
	isVisible,
	tradeRequest,
	currentPlayer,
	sourcePlayer,
	onAccept,
	onDeny,
	onClose,
}: TradeRequestPopupProps) {
	if (!isVisible || !tradeRequest) {
		return null;
	}

	const giveResources = tradeRequest.giveResources ?? createZeroResources();
	const receiveResources = tradeRequest.receiveResources ?? createZeroResources();
	const canAccept = currentPlayer !== null
		&& currentPlayer.resources !== null
		&& resourceTypes.every((resource) => (receiveResources[resource] ?? 0) <= (currentPlayer.resources?.[resource] ?? 0));

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.tradeRequestModal}>
				<div className={styles.tradeRequestHeader}>
					<h2 className={styles.tradeModalTitle}>Trade Request</h2>
					<button type="button" className={styles.tradeCloseButton} onClick={onClose}>
						✕
					</button>
				</div>

				<div className={styles.tradeRequestMeta}>
					<div>
						<strong>From:</strong> {sourcePlayer?.name ?? `Player ${tradeRequest.sourcePlayerId ?? "?"}`}
					</div>
					<div>
						<strong>To:</strong> All players
					</div>
				</div>

				<div className={styles.tradeRequestBody}>
					<div className={styles.tradeRequestSection}>
						<div className={styles.tradeRequestSectionTitle}>They offer</div>
						<div className={styles.tradeRequestResourceList}>
							{resourceTypes.map((resource) => (
								<span key={`offer-${resource}`} className={styles.tradeRequestResourceChip}>
									{resourceEmojiByType[resource]} {giveResources[resource] ?? 0}
								</span>
							))}
						</div>
					</div>

					<div className={styles.tradeRequestSection}>
						<div className={styles.tradeRequestSectionTitle}>They want</div>
						<div className={styles.tradeRequestResourceList}>
							{resourceTypes.map((resource) => (
								<span key={`want-${resource}`} className={styles.tradeRequestResourceChip}>
									{resourceEmojiByType[resource]} {receiveResources[resource] ?? 0}
								</span>
							))}
						</div>
					</div>
				</div>

				<p className={styles.tradeRequestNote}>
					Offer {formatResources(giveResources)} for {formatResources(receiveResources)}.
					Your response will be sent back to the requester.
				</p>

				<div className={styles.tradeRequestActions}>
					<button type="button" className={styles.tradeActionButton} onClick={onAccept} disabled={!canAccept}>
						Accept
					</button>
					<button type="button" className={styles.tradeDeclineButton} onClick={onDeny}>
						Deny
					</button>
				</div>
			</div>
		</div>
	);
}