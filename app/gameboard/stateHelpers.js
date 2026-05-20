export const resourceTypes = ["wood", "brick", "wool", "wheat", "ore"];

export const calculateWonResources = (before, after) => ({
	wood: Math.max(0, (after?.wood ?? 0) - (before?.wood ?? 0)),
	brick: Math.max(0, (after?.brick ?? 0) - (before?.brick ?? 0)),
	wool: Math.max(0, (after?.wool ?? 0) - (before?.wool ?? 0)),
	wheat: Math.max(0, (after?.wheat ?? 0) - (before?.wheat ?? 0)),
	ore: Math.max(0, (after?.ore ?? 0) - (before?.ore ?? 0)),
});

export const resolveDevelopmentCards = (serverCards, previousCards = [], options = {}) => {
	if (!Array.isArray(serverCards)) {
		return previousCards;
	}

	const preserveMaskingGap =
		options.preserveEmptyServerCards === true
		&& serverCards.length === 0
		&& previousCards.length > 0
		&& options.expectingAuthoritativeEmpty !== true;

	return preserveMaskingGap ? previousCards : serverCards;
};

export const shouldDelayDiscardModal = ({ mustDiscard, diceResult, showDicePopup, dicePopupValue }) =>
	Boolean(mustDiscard && diceResult === 7 && showDicePopup && dicePopupValue === 7);
