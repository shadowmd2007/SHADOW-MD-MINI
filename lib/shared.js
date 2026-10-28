export const shared = {
  botName: "RANA-FURQAN-MD-", prefix: ".", owner: "Owner",
  sessionId: null, isConnected: false, autoFix: true
};
export const setSession = (id) => { try { shared.sessionId = id; } catch {} };
export const getSession = () => { try { return shared.sessionId; } catch { return null; } };
export default shared;