import styles from "@/styles/gameboard.module.css";
import { resourceTypes } from "../constants";
import { createCanonicalCornerKey } from "../geometry";
import { HexTile, Player, PortVisual, ResourceType, Resources, TradeMode } from "../types";

interface TradeModalProps {
	isVisible: boolean;
	tradeMode: TradeMode;
	playerGiveResources: Resources;
	playerReceiveResources: Resources;
	bankGiveResources: Resources;
	bankReceiveResources: Resources;
	bankResources: Resources;
	currentPlayer: Player | null;
	ports: PortVisual[];
	hexById: Map<number, HexTile>;
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
	ports,
	hexById,
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

	const hasEnoughForBundle = (available: Resources, required: Resources): boolean =>
		resourceTypes.every((resource) => (required[resource] ?? 0) <= (available[resource] ?? 0));

	const ownedCornerKeys = new Set<string>();

	for (const settlement of currentPlayer?.settlementsOnCorners ?? []) {
		const settlementHex = hexById.get(settlement.hexId);
		if (settlementHex) {
			ownedCornerKeys.add(createCanonicalCornerKey(settlementHex, settlement.corner));
		}
	}

	for (const city of currentPlayer?.citiesOnCorners ?? []) {
		const cityHex = hexById.get(city.hexId);
		if (cityHex) {
			ownedCornerKeys.add(createCanonicalCornerKey(cityHex, city.corner));
		}
	}

	const getBestRatioForResource = (resource: ResourceType): number => {
		let bestRatio = 4;

		for (const port of ports) {
			const portHex = hexById.get(port.hexId);
			if (!portHex) {
				continue;
			}

			const firstCornerKey = createCanonicalCornerKey(portHex, port.corners[0]);
			const secondCornerKey = createCanonicalCornerKey(portHex, port.corners[1]);
			const hasPortAccess = ownedCornerKeys.has(firstCornerKey) || ownedCornerKeys.has(secondCornerKey);
			if (!hasPortAccess) {
				continue;
			}

			if (port.type === resource) {
				return 2;
			}

			if (port.type === "3:1") {
				bestRatio = Math.min(bestRatio, 3);
			}
		}

		return bestRatio;
	};

	const getPortRatioLabel = (resource: ResourceType): string => {
		const ratio = getBestRatioForResource(resource);
		if (ratio === 2) {
			return "1:2";
		}

		if (ratio === 3) {
			return "1:3";
		}

		return "1:4";
	};

	const playerGiveTotal = sumBundle(playerGiveResources);
	const playerReceiveTotal = sumBundle(playerReceiveResources);
	const bankGiveTotal = sumBundle(bankGiveResources);
	const bankReceiveTotal = sumBundle(bankReceiveResources);

	const canExecutePlayerTrade = Boolean(currentPlayer)
		&& playerGiveTotal > 0
		&& playerReceiveTotal > 0
		&& hasEnoughForBundle(currentPlayer?.resources ?? bankResources, playerGiveResources);

	const bankGiveMatchesPortRatios = resourceTypes.every((resource) => {
		const giveAmount = Math.max(0, bankGiveResources[resource] ?? 0);
		if (giveAmount === 0) {
			return true;
		}

		const ratio = getBestRatioForResource(resource);
		return giveAmount % ratio === 0;
	});

	const bankTradeUnits = resourceTypes.reduce((sum, resource) => {
		const giveAmount = Math.max(0, bankGiveResources[resource] ?? 0);
		const ratio = getBestRatioForResource(resource);
		return sum + Math.floor(giveAmount / ratio);
	}, 0);

	const canExecuteSelectedBankTrade = Boolean(currentPlayer)
		&& bankGiveTotal > 0
		&& bankReceiveTotal > 0
		&& bankGiveMatchesPortRatios
		&& bankTradeUnits === bankReceiveTotal
		&& hasEnoughForBundle(currentPlayer?.resources ?? bankResources, bankGiveResources)
		&& hasEnoughForBundle(bankResources, bankReceiveResources);

	const renderAdjustCard = (
		title: string,
		bundle: Resources,
		availability: Resources | undefined,
		onAdjust: (resource: ResourceType, delta: number) => void
	) => (
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
								{tradeMode === "bank" && title === "You Give" ? (
									<span style={{ marginLeft: 4, color: "#4ade80", fontSize: "0.8rem" }}>
										{getPortRatioLabel(resource)}
									</span>
								) : null}
							</div>
							<div className={styles.tradeAdjustStepper}>
								<button type="button" onClick={() => onAdjust(resource, -1)} disabled={amount <= 0}>-</button>
								<span>{amount}</span>
								<button type="button" onClick={() => onAdjust(resource, 1)} disabled={maxAmount !== null && amount >= maxAmount}>+</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.tradeModal}>
				<div className={styles.tradeModalHeader}>
					<h2 className={styles.tradeModalTitle}>Trade</h2>
					<button type="button" className={styles.tradeCloseButton} onClick={onClose}>✕</button>
				</div>

				<div className={styles.tradeBanner}>
					{tradeMode === "bank"
						? "Adjust each resource amount. Your current port bonuses will be applied automatically."
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
							{renderAdjustCard("You Offer", playerGiveResources, currentPlayer?.resources ?? bankResources, onAdjustPlayerGiveResource)}
							{renderAdjustCard("You Request", playerReceiveResources, undefined, onAdjustPlayerReceiveResource)}
						</div>

						<p className={styles.tradeSummaryText}>
							Offer {playerGiveTotal > 0 ? "resources" : "nothing"} for {playerReceiveTotal > 0 ? "resources" : "nothing"}
						</p>

						<button type="button" className={styles.tradeActionButton} onClick={onPlayerTrade} disabled={!canExecutePlayerTrade}>
							Broadcast Trade Request
						</button>
					</div>
				) : (
					<div className={styles.tradeContentStack}>
						<div className={styles.tradeControlsRow}>
							<div className={styles.tradeAmountGrid}>
								{renderAdjustCard("You Give", bankGiveResources, currentPlayer?.resources ?? bankResources, onAdjustBankGiveResource)}
								{renderAdjustCard("You Receive", bankReceiveResources, bankResources, onAdjustBankReceiveResource)}
							</div>
						</div>

						<p className={styles.tradeSummaryText}>
							Give {bankGiveTotal > 0 ? "resources" : "nothing"} for {bankReceiveTotal > 0 ? "resources" : "nothing"}
						</p>

						<button type="button" className={styles.tradeActionButton} onClick={onBankTrade} disabled={!canExecuteSelectedBankTrade}>
							Execute Bank Trade
						</button>
					</div>
				)}
			</div>
		</div>
	);
}