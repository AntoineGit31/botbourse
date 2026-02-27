"""
BotBourse Pipeline Configuration

Defines the universe of assets to track, horizons, and output paths.
"""

import os
from pathlib import Path

# ─── Paths ───
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR.parent / "public" / "data"  # Output into Next.js public/ for easy access
PRICES_DIR = DATA_DIR / "prices"
FEATURES_DIR = DATA_DIR / "features"

# Ensure directories exist
for d in [DATA_DIR, PRICES_DIR, FEATURES_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── Asset Universe ───
# ~150 stocks: US large/mid cap + European large cap (FR, DE, NL, UK, CH, DK, ES, IT, BE, SE)
# ~40 ETFs: broad, sector, regional, thematic — focus on European-domiciled UCITS

STOCKS = {
    # ══════════════════════════════════════════
    #  US — Large Cap (~50)
    # ══════════════════════════════════════════
    "AAPL":   {"name": "Apple Inc.", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "MSFT":   {"name": "Microsoft Corp.", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "NVDA":   {"name": "NVIDIA Corp.", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "AMZN":   {"name": "Amazon.com Inc.", "sector": "Consumer", "region": "US", "exchange": "NASDAQ"},
    "GOOGL":  {"name": "Alphabet Inc.", "sector": "Communication", "region": "US", "exchange": "NASDAQ"},
    "META":   {"name": "Meta Platforms Inc.", "sector": "Communication", "region": "US", "exchange": "NASDAQ"},
    "TSLA":   {"name": "Tesla Inc.", "sector": "Consumer", "region": "US", "exchange": "NASDAQ"},
    "JPM":    {"name": "JPMorgan Chase & Co.", "sector": "Finance", "region": "US", "exchange": "NYSE"},
    "V":      {"name": "Visa Inc.", "sector": "Finance", "region": "US", "exchange": "NYSE"},
    "JNJ":    {"name": "Johnson & Johnson", "sector": "Healthcare", "region": "US", "exchange": "NYSE"},
    "UNH":    {"name": "UnitedHealth Group", "sector": "Healthcare", "region": "US", "exchange": "NYSE"},
    "XOM":    {"name": "Exxon Mobil Corp.", "sector": "Energy", "region": "US", "exchange": "NYSE"},
    "PG":     {"name": "Procter & Gamble Co.", "sector": "Consumer", "region": "US", "exchange": "NYSE"},
    "HD":     {"name": "Home Depot Inc.", "sector": "Consumer", "region": "US", "exchange": "NYSE"},
    "MA":     {"name": "Mastercard Inc.", "sector": "Finance", "region": "US", "exchange": "NYSE"},
    "AVGO":   {"name": "Broadcom Inc.", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "COST":   {"name": "Costco Wholesale", "sector": "Consumer", "region": "US", "exchange": "NASDAQ"},
    "ABBV":   {"name": "AbbVie Inc.", "sector": "Healthcare", "region": "US", "exchange": "NYSE"},
    "CRM":    {"name": "Salesforce Inc.", "sector": "Technology", "region": "US", "exchange": "NYSE"},
    "AMD":    {"name": "Advanced Micro Devices", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "NFLX":   {"name": "Netflix Inc.", "sector": "Communication", "region": "US", "exchange": "NASDAQ"},
    "LIN":    {"name": "Linde plc", "sector": "Materials", "region": "US", "exchange": "NYSE"},
    "PANW":   {"name": "Palo Alto Networks", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "INTC":   {"name": "Intel Corp.", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "DIS":    {"name": "Walt Disney Co.", "sector": "Communication", "region": "US", "exchange": "NYSE"},
    "KO":     {"name": "Coca-Cola Co.", "sector": "Consumer", "region": "US", "exchange": "NYSE"},
    "PEP":    {"name": "PepsiCo Inc.", "sector": "Consumer", "region": "US", "exchange": "NASDAQ"},
    "MRK":    {"name": "Merck & Co.", "sector": "Healthcare", "region": "US", "exchange": "NYSE"},
    "WMT":    {"name": "Walmart Inc.", "sector": "Consumer", "region": "US", "exchange": "NYSE"},
    "CSCO":   {"name": "Cisco Systems", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "ORCL":   {"name": "Oracle Corp.", "sector": "Technology", "region": "US", "exchange": "NYSE"},
    "ACN":    {"name": "Accenture plc", "sector": "Technology", "region": "US", "exchange": "NYSE"},
    "IBM":    {"name": "IBM Corp.", "sector": "Technology", "region": "US", "exchange": "NYSE"},
    "NOW":    {"name": "ServiceNow Inc.", "sector": "Technology", "region": "US", "exchange": "NYSE"},
    "QCOM":   {"name": "Qualcomm Inc.", "sector": "Technology", "region": "US", "exchange": "NASDAQ"},
    "GS":     {"name": "Goldman Sachs Group", "sector": "Finance", "region": "US", "exchange": "NYSE"},
    "MS":     {"name": "Morgan Stanley", "sector": "Finance", "region": "US", "exchange": "NYSE"},
    "BAC":    {"name": "Bank of America Corp.", "sector": "Finance", "region": "US", "exchange": "NYSE"},
    "BLK":    {"name": "BlackRock Inc.", "sector": "Finance", "region": "US", "exchange": "NYSE"},
    "PYPL":   {"name": "PayPal Holdings", "sector": "Finance", "region": "US", "exchange": "NASDAQ"},
    "PFE":    {"name": "Pfizer Inc.", "sector": "Healthcare", "region": "US", "exchange": "NYSE"},
    "LLY":    {"name": "Eli Lilly & Co.", "sector": "Healthcare", "region": "US", "exchange": "NYSE"},
    "TMO":    {"name": "Thermo Fisher Scientific", "sector": "Healthcare", "region": "US", "exchange": "NYSE"},
    "CVX":    {"name": "Chevron Corp.", "sector": "Energy", "region": "US", "exchange": "NYSE"},
    "COP":    {"name": "ConocoPhillips", "sector": "Energy", "region": "US", "exchange": "NYSE"},
    "NEE":    {"name": "NextEra Energy", "sector": "Utilities", "region": "US", "exchange": "NYSE"},
    "CAT":    {"name": "Caterpillar Inc.", "sector": "Industrials", "region": "US", "exchange": "NYSE"},
    "BA":     {"name": "Boeing Co.", "sector": "Industrials", "region": "US", "exchange": "NYSE"},
    "GE":     {"name": "GE Aerospace", "sector": "Industrials", "region": "US", "exchange": "NYSE"},
    "DE":     {"name": "Deere & Company", "sector": "Industrials", "region": "US", "exchange": "NYSE"},

    # ══════════════════════════════════════════
    #  France — CAC 40 & SBF 120 (~25)
    # ══════════════════════════════════════════
    "MC.PA":     {"name": "LVMH Moet Hennessy", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Paris"},
    "OR.PA":     {"name": "L'Oreal SA", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Paris"},
    "TTE.PA":    {"name": "TotalEnergies SE", "sector": "Energy", "region": "Europe", "exchange": "Euronext Paris"},
    "SAN.PA":    {"name": "Sanofi SA", "sector": "Healthcare", "region": "Europe", "exchange": "Euronext Paris"},
    "AIR.PA":    {"name": "Airbus SE", "sector": "Industrials", "region": "Europe", "exchange": "Euronext Paris"},
    "SU.PA":     {"name": "Schneider Electric", "sector": "Industrials", "region": "Europe", "exchange": "Euronext Paris"},
    "BNP.PA":    {"name": "BNP Paribas SA", "sector": "Finance", "region": "Europe", "exchange": "Euronext Paris"},
    "AI.PA":     {"name": "Air Liquide SA", "sector": "Materials", "region": "Europe", "exchange": "Euronext Paris"},
    "DG.PA":     {"name": "Vinci SA", "sector": "Industrials", "region": "Europe", "exchange": "Euronext Paris"},
    "BN.PA":     {"name": "Danone SA", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Paris"},
    "RI.PA":     {"name": "Pernod Ricard SA", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Paris"},
    "KER.PA":    {"name": "Kering SA", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Paris"},
    "CAP.PA":    {"name": "Capgemini SE", "sector": "Technology", "region": "Europe", "exchange": "Euronext Paris"},
    "STM.PA":    {"name": "STMicroelectronics", "sector": "Technology", "region": "Europe", "exchange": "Euronext Paris"},
    "CS.PA":     {"name": "AXA SA", "sector": "Finance", "region": "Europe", "exchange": "Euronext Paris"},
    "GLE.PA":    {"name": "Societe Generale SA", "sector": "Finance", "region": "Europe", "exchange": "Euronext Paris"},
    "SGO.PA":    {"name": "Saint-Gobain SA", "sector": "Industrials", "region": "Europe", "exchange": "Euronext Paris"},
    "DSY.PA":    {"name": "Dassault Systemes SE", "sector": "Technology", "region": "Europe", "exchange": "Euronext Paris"},
    "HO.PA":     {"name": "Thales SA", "sector": "Industrials", "region": "Europe", "exchange": "Euronext Paris"},
    "EN.PA":     {"name": "Bouygues SA", "sector": "Industrials", "region": "Europe", "exchange": "Euronext Paris"},
    "VIV.PA":    {"name": "Vivendi SE", "sector": "Communication", "region": "Europe", "exchange": "Euronext Paris"},
    "ORA.PA":    {"name": "Orange SA", "sector": "Communication", "region": "Europe", "exchange": "Euronext Paris"},
    "RMS.PA":    {"name": "Hermes International", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Paris"},
    "EL.PA":     {"name": "EssilorLuxottica SA", "sector": "Healthcare", "region": "Europe", "exchange": "Euronext Paris"},
    "SAF.PA":    {"name": "Safran SA", "sector": "Industrials", "region": "Europe", "exchange": "Euronext Paris"},

    # ══════════════════════════════════════════
    #  Germany — DAX (~15)
    # ══════════════════════════════════════════
    "SAP":       {"name": "SAP SE", "sector": "Technology", "region": "Europe", "exchange": "XETRA"},
    "SIE.DE":    {"name": "Siemens AG", "sector": "Industrials", "region": "Europe", "exchange": "XETRA"},
    "ALV.DE":    {"name": "Allianz SE", "sector": "Finance", "region": "Europe", "exchange": "XETRA"},
    "DTE.DE":    {"name": "Deutsche Telekom AG", "sector": "Communication", "region": "Europe", "exchange": "XETRA"},
    "MBG.DE":    {"name": "Mercedes-Benz Group", "sector": "Consumer", "region": "Europe", "exchange": "XETRA"},
    "BMW.DE":    {"name": "BMW AG", "sector": "Consumer", "region": "Europe", "exchange": "XETRA"},
    "BAS.DE":    {"name": "BASF SE", "sector": "Materials", "region": "Europe", "exchange": "XETRA"},
    "MUV2.DE":   {"name": "Munich Re", "sector": "Finance", "region": "Europe", "exchange": "XETRA"},
    "IFX.DE":    {"name": "Infineon Technologies", "sector": "Technology", "region": "Europe", "exchange": "XETRA"},
    "ADS.DE":    {"name": "Adidas AG", "sector": "Consumer", "region": "Europe", "exchange": "XETRA"},
    "DHL.DE":    {"name": "DHL Group", "sector": "Industrials", "region": "Europe", "exchange": "XETRA"},
    "RWE.DE":    {"name": "RWE AG", "sector": "Utilities", "region": "Europe", "exchange": "XETRA"},
    "VOW3.DE":   {"name": "Volkswagen AG", "sector": "Consumer", "region": "Europe", "exchange": "XETRA"},
    "DB1.DE":    {"name": "Deutsche Boerse AG", "sector": "Finance", "region": "Europe", "exchange": "XETRA"},
    "HEN3.DE":   {"name": "Henkel AG", "sector": "Consumer", "region": "Europe", "exchange": "XETRA"},

    # ══════════════════════════════════════════
    #  Netherlands — AEX (~8)
    # ══════════════════════════════════════════
    "ASML":      {"name": "ASML Holding NV", "sector": "Technology", "region": "Europe", "exchange": "Euronext Amsterdam"},
    "PHIA.AS":   {"name": "Koninklijke Philips", "sector": "Healthcare", "region": "Europe", "exchange": "Euronext Amsterdam"},
    "INGA.AS":   {"name": "ING Group NV", "sector": "Finance", "region": "Europe", "exchange": "Euronext Amsterdam"},
    "UNA.AS":    {"name": "Unilever NV", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Amsterdam"},
    "AD.AS":     {"name": "Ahold Delhaize NV", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Amsterdam"},
    "WKL.AS":    {"name": "Wolters Kluwer NV", "sector": "Communication", "region": "Europe", "exchange": "Euronext Amsterdam"},
    "PRX.AS":    {"name": "Prosus NV", "sector": "Technology", "region": "Europe", "exchange": "Euronext Amsterdam"},
    "HEIA.AS":   {"name": "Heineken NV", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Amsterdam"},

    # ══════════════════════════════════════════
    #  UK — FTSE 100 (~12)
    # ══════════════════════════════════════════
    "SHEL":      {"name": "Shell plc", "sector": "Energy", "region": "Europe", "exchange": "LSE"},
    "AZN":       {"name": "AstraZeneca plc", "sector": "Healthcare", "region": "Europe", "exchange": "LSE"},
    "HSBA.L":    {"name": "HSBC Holdings plc", "sector": "Finance", "region": "Europe", "exchange": "LSE"},
    "ULVR.L":    {"name": "Unilever plc", "sector": "Consumer", "region": "Europe", "exchange": "LSE"},
    "BP.L":      {"name": "BP plc", "sector": "Energy", "region": "Europe", "exchange": "LSE"},
    "GSK.L":     {"name": "GSK plc", "sector": "Healthcare", "region": "Europe", "exchange": "LSE"},
    "RIO.L":     {"name": "Rio Tinto plc", "sector": "Materials", "region": "Europe", "exchange": "LSE"},
    "LSEG.L":    {"name": "London Stock Exchange Group", "sector": "Finance", "region": "Europe", "exchange": "LSE"},
    "DGE.L":     {"name": "Diageo plc", "sector": "Consumer", "region": "Europe", "exchange": "LSE"},
    "BA.L":      {"name": "BAE Systems plc", "sector": "Industrials", "region": "Europe", "exchange": "LSE"},
    "RR.L":      {"name": "Rolls-Royce Holdings", "sector": "Industrials", "region": "Europe", "exchange": "LSE"},
    "EXPN.L":    {"name": "Experian plc", "sector": "Technology", "region": "Europe", "exchange": "LSE"},

    # ══════════════════════════════════════════
    #  Switzerland — SMI (~6)
    # ══════════════════════════════════════════
    "NESN.SW":   {"name": "Nestle SA", "sector": "Consumer", "region": "Europe", "exchange": "SIX"},
    "ROG.SW":    {"name": "Roche Holding AG", "sector": "Healthcare", "region": "Europe", "exchange": "SIX"},
    "NOVN.SW":   {"name": "Novartis AG", "sector": "Healthcare", "region": "Europe", "exchange": "SIX"},
    "UBSG.SW":   {"name": "UBS Group AG", "sector": "Finance", "region": "Europe", "exchange": "SIX"},
    "ABBN.SW":   {"name": "ABB Ltd", "sector": "Industrials", "region": "Europe", "exchange": "SIX"},
    "ZURN.SW":   {"name": "Zurich Insurance Group", "sector": "Finance", "region": "Europe", "exchange": "SIX"},

    # ══════════════════════════════════════════
    #  Scandinavia — OMX (~6)
    # ══════════════════════════════════════════
    "NOVO-B.CO": {"name": "Novo Nordisk A/S", "sector": "Healthcare", "region": "Europe", "exchange": "OMX Copenhagen"},
    "ERIC-B.ST": {"name": "Ericsson AB", "sector": "Technology", "region": "Europe", "exchange": "OMX Stockholm"},
    "VOLV-B.ST": {"name": "Volvo AB", "sector": "Industrials", "region": "Europe", "exchange": "OMX Stockholm"},
    "SAND.ST":   {"name": "Sandvik AB", "sector": "Industrials", "region": "Europe", "exchange": "OMX Stockholm"},
    "HM-B.ST":   {"name": "H&M AB", "sector": "Consumer", "region": "Europe", "exchange": "OMX Stockholm"},
    "NESTE.HE":  {"name": "Neste Oyj", "sector": "Energy", "region": "Europe", "exchange": "OMX Helsinki"},

    # ══════════════════════════════════════════
    #  Spain & Italy (~8)
    # ══════════════════════════════════════════
    "SAN.MC":    {"name": "Banco Santander SA", "sector": "Finance", "region": "Europe", "exchange": "BME"},
    "ITX.MC":    {"name": "Inditex SA", "sector": "Consumer", "region": "Europe", "exchange": "BME"},
    "IBE.MC":    {"name": "Iberdrola SA", "sector": "Utilities", "region": "Europe", "exchange": "BME"},
    "TEF.MC":    {"name": "Telefonica SA", "sector": "Communication", "region": "Europe", "exchange": "BME"},
    "ISP.MI":    {"name": "Intesa Sanpaolo SpA", "sector": "Finance", "region": "Europe", "exchange": "Borsa Italiana"},
    "ENI.MI":    {"name": "Eni SpA", "sector": "Energy", "region": "Europe", "exchange": "Borsa Italiana"},
    "UCG.MI":    {"name": "UniCredit SpA", "sector": "Finance", "region": "Europe", "exchange": "Borsa Italiana"},
    "ENEL.MI":   {"name": "Enel SpA", "sector": "Utilities", "region": "Europe", "exchange": "Borsa Italiana"},

    # ══════════════════════════════════════════
    #  Belgium (~3)
    # ══════════════════════════════════════════
    "ABI.BR":    {"name": "Anheuser-Busch InBev", "sector": "Consumer", "region": "Europe", "exchange": "Euronext Brussels"},
    "UCB.BR":    {"name": "UCB SA", "sector": "Healthcare", "region": "Europe", "exchange": "Euronext Brussels"},
    "SOLB.BR":   {"name": "Solvay SA", "sector": "Materials", "region": "Europe", "exchange": "Euronext Brussels"},
}

ETFS = {
    # ── Broad World ──
    "IWDA.AS":  {"name": "iShares Core MSCI World", "index_tracked": "MSCI World", "ter": 0.0020, "domicile": "Ireland", "category": "Equity World", "region": "World", "exchange": "Euronext"},
    "VWCE.DE":  {"name": "Vanguard FTSE All-World", "index_tracked": "FTSE All-World", "ter": 0.0022, "domicile": "Ireland", "category": "Equity World", "region": "World", "exchange": "XETRA"},
    "URTH":     {"name": "iShares MSCI World ETF", "index_tracked": "MSCI World", "ter": 0.0024, "domicile": "US", "category": "Equity World", "region": "World", "exchange": "NYSE"},

    # ── US Equity ──
    "VUSA.AS":  {"name": "Vanguard S&P 500 UCITS", "index_tracked": "S&P 500", "ter": 0.0007, "domicile": "Ireland", "category": "Equity US Large Cap", "region": "US", "exchange": "Euronext"},
    "CSPX.AS":  {"name": "iShares Core S&P 500 UCITS", "index_tracked": "S&P 500", "ter": 0.0007, "domicile": "Ireland", "category": "Equity US Large Cap", "region": "US", "exchange": "Euronext"},
    "EQQQ.DE":  {"name": "Invesco NASDAQ-100 UCITS", "index_tracked": "NASDAQ-100", "ter": 0.0030, "domicile": "Ireland", "category": "Equity US Tech", "region": "US", "exchange": "XETRA"},
    "SPY":      {"name": "SPDR S&P 500 ETF Trust", "index_tracked": "S&P 500", "ter": 0.0009, "domicile": "US", "category": "Equity US Large Cap", "region": "US", "exchange": "NYSE"},
    "QQQ":      {"name": "Invesco QQQ Trust", "index_tracked": "NASDAQ-100", "ter": 0.0020, "domicile": "US", "category": "Equity US Tech", "region": "US", "exchange": "NASDAQ"},
    "IWM":      {"name": "iShares Russell 2000 ETF", "index_tracked": "Russell 2000", "ter": 0.0019, "domicile": "US", "category": "Equity US Small Cap", "region": "US", "exchange": "NYSE"},
    "VTV":      {"name": "Vanguard Value ETF", "index_tracked": "CRSP US Large Cap Value", "ter": 0.0004, "domicile": "US", "category": "Equity US Value", "region": "US", "exchange": "NYSE"},
    "VUG":      {"name": "Vanguard Growth ETF", "index_tracked": "CRSP US Large Cap Growth", "ter": 0.0004, "domicile": "US", "category": "Equity US Growth", "region": "US", "exchange": "NYSE"},

    # ── European Equity ──
    "MEUD.PA":  {"name": "Amundi MSCI Europe UCITS", "index_tracked": "MSCI Europe", "ter": 0.0015, "domicile": "Luxembourg", "category": "Equity Europe", "region": "Europe", "exchange": "Euronext"},
    "CEU.PA":   {"name": "Amundi Euro Stoxx 50 UCITS", "index_tracked": "Euro Stoxx 50", "ter": 0.0009, "domicile": "France", "category": "Equity Eurozone", "region": "Europe", "exchange": "Euronext"},
    "VEUR.AS":  {"name": "Vanguard FTSE Dev Europe UCITS", "index_tracked": "FTSE Developed Europe", "ter": 0.0010, "domicile": "Ireland", "category": "Equity Europe", "region": "Europe", "exchange": "Euronext"},
    "EZU":      {"name": "iShares MSCI Eurozone ETF", "index_tracked": "MSCI EMU", "ter": 0.0049, "domicile": "US", "category": "Equity Eurozone", "region": "Europe", "exchange": "NYSE"},
    "EWG":      {"name": "iShares MSCI Germany ETF", "index_tracked": "MSCI Germany", "ter": 0.0050, "domicile": "US", "category": "Equity Germany", "region": "Europe", "exchange": "NYSE"},
    "EWQ":      {"name": "iShares MSCI France ETF", "index_tracked": "MSCI France", "ter": 0.0050, "domicile": "US", "category": "Equity France", "region": "Europe", "exchange": "NYSE"},
    "EWU":      {"name": "iShares MSCI UK ETF", "index_tracked": "MSCI United Kingdom", "ter": 0.0050, "domicile": "US", "category": "Equity UK", "region": "Europe", "exchange": "NYSE"},

    # ── Emerging Markets ──
    "VFEM.AS":  {"name": "Vanguard FTSE EM UCITS", "index_tracked": "FTSE Emerging", "ter": 0.0022, "domicile": "Ireland", "category": "Equity Emerging Markets", "region": "Asia", "exchange": "Euronext"},
    "EEM":      {"name": "iShares MSCI Emerging Markets", "index_tracked": "MSCI Emerging Markets", "ter": 0.0068, "domicile": "US", "category": "Equity Emerging Markets", "region": "Asia", "exchange": "NYSE"},
    "VWO":      {"name": "Vanguard FTSE Emerging Markets", "index_tracked": "FTSE Emerging Markets", "ter": 0.0008, "domicile": "US", "category": "Equity Emerging Markets", "region": "Asia", "exchange": "NYSE"},
    "FXI":      {"name": "iShares China Large-Cap ETF", "index_tracked": "FTSE China 50", "ter": 0.0074, "domicile": "US", "category": "Equity China", "region": "Asia", "exchange": "NYSE"},

    # ── Sector ETFs ──
    "XLK":      {"name": "Technology Select Sector SPDR", "index_tracked": "S&P Technology", "ter": 0.0009, "domicile": "US", "category": "Sector Technology", "region": "US", "exchange": "NYSE"},
    "XLF":      {"name": "Financial Select Sector SPDR", "index_tracked": "S&P Financials", "ter": 0.0009, "domicile": "US", "category": "Sector Financials", "region": "US", "exchange": "NYSE"},
    "XLE":      {"name": "Energy Select Sector SPDR", "index_tracked": "S&P Energy", "ter": 0.0009, "domicile": "US", "category": "Sector Energy", "region": "US", "exchange": "NYSE"},
    "XLV":      {"name": "Health Care Select Sector SPDR", "index_tracked": "S&P Health Care", "ter": 0.0009, "domicile": "US", "category": "Sector Healthcare", "region": "US", "exchange": "NYSE"},
    "XLI":      {"name": "Industrial Select Sector SPDR", "index_tracked": "S&P Industrials", "ter": 0.0009, "domicile": "US", "category": "Sector Industrials", "region": "US", "exchange": "NYSE"},

    # ── Thematic ──
    "ICLN":     {"name": "iShares Global Clean Energy", "index_tracked": "S&P Global Clean Energy", "ter": 0.0040, "domicile": "US", "category": "Thematic Clean Energy", "region": "World", "exchange": "NASDAQ"},
    "ARKK":     {"name": "ARK Innovation ETF", "index_tracked": "ARK Innovation", "ter": 0.0075, "domicile": "US", "category": "Thematic Innovation", "region": "US", "exchange": "NYSE"},
    "SOXX":     {"name": "iShares Semiconductor ETF", "index_tracked": "ICE Semiconductor", "ter": 0.0035, "domicile": "US", "category": "Thematic Semiconductors", "region": "US", "exchange": "NASDAQ"},
    "TAN":      {"name": "Invesco Solar ETF", "index_tracked": "MAC Global Solar Energy", "ter": 0.0067, "domicile": "US", "category": "Thematic Solar", "region": "World", "exchange": "NYSE"},

    # ── Fixed Income & Commodities ──
    "GLD":      {"name": "SPDR Gold Shares", "index_tracked": "Gold Spot Price", "ter": 0.0040, "domicile": "US", "category": "Commodity Gold", "region": "World", "exchange": "NYSE"},
    "SLV":      {"name": "iShares Silver Trust", "index_tracked": "Silver Spot Price", "ter": 0.0050, "domicile": "US", "category": "Commodity Silver", "region": "World", "exchange": "NYSE"},
    "TLT":      {"name": "iShares 20+ Year Treasury Bond", "index_tracked": "ICE US Treasury 20+ Year", "ter": 0.0015, "domicile": "US", "category": "Bond US Long Term", "region": "US", "exchange": "NASDAQ"},
}

# Combined universe
ALL_TICKERS = list(STOCKS.keys()) + list(ETFS.keys())

# ─── Market Indices ───
INDICES = {
    "^GSPC":     {"name": "S&P 500"},
    "^IXIC":     {"name": "NASDAQ Composite"},
    "^DJI":      {"name": "Dow Jones"},
    "^FCHI":     {"name": "CAC 40"},
    "^GDAXI":    {"name": "DAX"},
    "^STOXX50E": {"name": "Euro Stoxx 50"},
    "^FTSE":     {"name": "FTSE 100"},
    "^IBEX":     {"name": "IBEX 35"},
    "FTSEMIB.MI": {"name": "FTSE MIB"},
    "^N225":     {"name": "Nikkei 225"},
}

# ─── Horizons ───
HORIZONS = {
    "short":  {"days": 30, "label": "Short-term (~30 days)"},
    "medium": {"days": 252, "label": "Medium-term (~12 months)"},
    "long":   {"days": 756, "label": "Long-term (~3 years)"},
}

# ─── Data Fetch Settings ───
HISTORY_PERIOD = "5y"  # 5 years of daily data
