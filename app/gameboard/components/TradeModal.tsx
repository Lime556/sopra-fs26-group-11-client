import styles from "@/styles/gameboard.module.css";
import { Player, ResourceType, Resources, TradeMode } from "../types";
import { resourceTypes } from "../constants";

interface TradeModalProps {
	isVisible: boolean;
	tradeMode: TradeMode;
	playerGiveResources: Resources;
	playerReceiveResources: Resources;
	bankGiveResources: Resources;
	bankReceiveResources: Resources;
	bankResources: Resources;
	currentPlayer: Player | null;
	onClose: () => void;
	onSetTradeMode: (mode: TradeMode) => void;
	onAdjustPlayerGiveResource: (resource: ResourceType, delta: number) => void;
	onAdjustPlayerReceiveResource: (resource: ResourceType, delta: number) => void;
	onAdjustBankGiveResource: (resource: ResourceType, delta: number) => void;
	onAdjustBankReceiveResource: (resource: ResourceType, delta: number) => void;
	onBankTrade: () => void;
	onPlayerTrade: () => void;
}

export function TradeModal({
	isVisible,
	tradeMode,
	playerGiveResources,
	playerReceiveResources,
	bankGiveResources,
	bankReceiveResources,
	bankResources,
	currentPlayer,
	onClose,
	onSetTradeMode,
	onAdjustPlayerGiveResource,
	onAdjustPlayerReceiveResource,
	onAdjustBankGiveResource,
	onAdjustBankReceiveResource,
	onBankTrade,
	onPlayerTrade,
}: TradeModalProps) {
	if (!isVisible) {
		return null;
	}

	const resourceIconByType: Record<ResourceType, string> = {
		wood: "🌲",
		brick: "🧱",
		wool: "🐑",
		wheat: "🌾",
		ore: "⛰️",
	};

	const sumBundle = (bundle: Resources): number =>
		resourceTypes.reduce((sum, resource) => sum + Math.max(0, bundle[resource] ?? 0), 0);

	const formatBundle = (bundle: Resources): string => {
		const parts = resourceTypes
			.filter((resource) => (bundle[resource] ?? 0) > 0)
			.map((resource) => `${bundle[resource]} ${resource === "wool" ? "sheep" : resource}`);
		return parts.length > 0 ? parts.join(" + ") : "nothing";
	};

	const hasEnoughForBundle = (available: Resources, required: Resources): boolean => {
		return resourceTypes.every((resource) => (required[resource] ?? 0) <= (available[resource] ?? 0));
	};

	const playerGiveTotal = sumBundle(playerGiveResources);
	const playerReceiveTotal = sumBundle(playerReceiveResources);
	const bankGiveTotal = sumBundle(bankGiveResources);
	const bankReceiveTotal = sumBundle(bankReceiveResources);
	const canExecutePlayerTrade = Boolean(currentPlayer)
		&& playerGiveTotal > 0
		&& playerReceiveTotal > 0
		&& hasEnoughForBundle(currentPlayer?.resources ?? bankResources, playerGiveResources);

	const canExecuteSelectedBankTrade = Boolean(currentPlayer)
		&& bankGiveTotal > 0
		&& bankReceiveTotal > 0
		&& bankGiveTotal === bankReceiveTotal * 4
		&& hasEnoughForBundle(currentPlayer?.resources ?? bankResources, bankGiveResources)
		&& hasEnoughForBundle(bankResources, bankReceiveResources);

	const renderAdjustCard = (
		title: string,
		bundle: Resources,
		availability: Resources | undefined,
		onAdjust: (resource: ResourceType, delta: number) => void
	) => {
		return (
			<div className={styles.tradeAmountCard}>
				<span className={styles.tradeAmountTitle}>{title}</span>
				<div className={styles.tradeAdjustList}>
					{resourceTypes.map((resource) => {
						const amount = bundle[resource] ?? 0;
						const maxAmount = availability?.[resource] ?? null;
						return (
							<div key={`${title}-${resource}`} className={styles.tradeAdjustRow}>
								<div className={styles.tradeAdjustResource}>
									<span className={styles.tradeResourceIcon}>{resourceIconByType[resource]}</span>
									<span className={styles.tradeAmountResourceName}>{resource === "wool" ? "sheep" : resource}</span>
								</div>
								<div className={styles.tradeAdjustStepper}>
									<button
										type="button"
										onClick={() => onAdjust(resource, -1)}
										disabled={amount <= 0}
									>
										-
									</button>
									<span>{amount}</span>
									<button
										type="button"
										onClick={() => onAdjust(resource, 1)}
										disabled={maxAmount !== null && amount >= maxAmount}
									>
										+
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.tradeModal}>
				<div className={styles.tradeModalHeader}>
					<h2 className={styles.tradeModalTitle}>Trade</h2>
					<button type="button" className={styles.tradeCloseButton} onClick={onClose}>
						✕
					</button>
				</div>

				<div className={styles.tradeBanner}>
					{tradeMode === "bank"
						? "Adjust each resource amount. Bank trades require total give to equal 4x total receive."
						: "Choose what you offer and what you want. The request will be broadcast to every other player."}
				</div>

				<div className={styles.tradeModeTabs}>
					<button
						type="button"
						className={`${styles.tradeModeButton} ${tradeMode === "player" ? styles.tradeModeButtonActive : ""}`}
						onClick={() => onSetTradeMode("player")}
					>
						Trade with Players
					</button>
					<button
						type="button"
						className={`${styles.tradeModeButton} ${tradeMode === "bank" ? styles.tradeModeButtonActive : ""}`}
						onClick={() => onSetTradeMode("bank")}
					>
						Trade with Bank
					</button>
				</div>

				{tradeMode === "player" ? (
					<div className={styles.tradeContentStack}>
						<div className={styles.tradeAmountGrid}>
							{renderAdjustCard(
								"You Offer",
								playerGiveResources,
								currentPlayer?.resources ?? bankResources,
								onAdjustPlayerGiveResource
							)}
							{renderAdjustCard(
								"You Request",
								playerReceiveResources,
								undefined,
								onAdjustPlayerReceiveResource
							)}
						</div>

						<p className={styles.tradeSummaryText}>
							Offer {formatBundle(playerGiveResources)} for {formatBundle(playerReceiveResources)}
						</p>

						<button
							type="button"
							className={styles.tradeActionButton}
							onClick={onPlayerTrade}
							disabled={!canExecutePlayerTrade}
						>
							Broadcast Trade Request
						</button>
					</div>
				) : (
					<div className={styles.tradeContentStack}>
						<div className={styles.tradeControlsRow}>
							<div className={styles.tradeAmountGrid}>
								{renderAdjustCard(
									"You Give",
									bankGiveResources,
									currentPlayer?.resources ?? bankResources,
									onAdjustBankGiveResource
								)}
								{renderAdjustCard(
									"You Receive",
									bankReceiveResources,
									bankResources,
									onAdjustBankReceiveResource
								)}
							</div>
						</div>

						<p className={styles.tradeSummaryText}>
							Give {formatBundle(bankGiveResources)} for {formatBundle(bankReceiveResources)}
						</p>

						<button
							type="button"
							className={styles.tradeActionButton}
							onClick={onBankTrade}
							disabled={!canExecuteSelectedBankTrade}
						>
							Execute Bank Trade
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
