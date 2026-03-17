import pandas as pd
import json

import requests
import io

def fetch_table(url, table_index=0, symbol_col='Symbol', name_col='Security', sector_col='GICS Sector', suffix='', region='US', exchange='US'):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        req = pd.read_html(io.StringIO(resp.text))
        df = req[table_index]
        res = {}
        for _, row in df.iterrows():
            ticker = str(row[symbol_col]).replace('.', '-')
            if "nan" in ticker.lower() or not ticker.strip() or "symbol" in ticker.lower():
                continue
            ticker = ticker + suffix
            
            # Default fallback for missing cols
            name = str(row[name_col]) if name_col in df.columns else ticker
            sector = str(row[sector_col]) if sector_col in df.columns else "Diversified"
            
            res[ticker] = {
                "name": name[:40],
                "sector": sector[:30],
                "region": region,
                "exchange": exchange
            }
        return res
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return {}

def main():
    print("Fetching S&P 500...")
    sp500 = fetch_table('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', 0, 'Symbol', 'Security', 'GICS Sector', '', 'US', 'NYSE/NASDAQ')
    print(f"Got {len(sp500)} S&P 500")

    print("Fetching S&P MidCap 400...")
    mid400 = fetch_table('https://en.wikipedia.org/wiki/List_of_S%26P_400_companies', 0, 'Symbol', 'Security', 'GICS Sector', '', 'US', 'US')
    print(f"Got {len(mid400)} S&P 400")

    print("Fetching S&P SmallCap 600...")
    small600 = fetch_table('https://en.wikipedia.org/wiki/List_of_S%26P_600_companies', 0, 'Symbol', 'Security', 'GICS Sector', '', 'US', 'US')
    print(f"Got {len(small600)} S&P 600")

    print("Fetching TSX 60 (Canada)...")
    tsx60 = fetch_table('https://en.wikipedia.org/wiki/S%26P/TSX_60', 1, 'Symbol', 'Company', 'Sector', '.TO', 'Americas', 'TSX')
    print(f"Got {len(tsx60)} TSX 60")

    print("Fetching DAX (Germany)...")
    dax = fetch_table('https://en.wikipedia.org/wiki/DAX', 4, 'Ticker', 'Company', 'Prime Standard Sector', '.DE', 'Europe', 'XETRA')
    print(f"Got {len(dax)} DAX")

    print("Fetching CAC 40 (France)...")
    cac = fetch_table('https://en.wikipedia.org/wiki/CAC_40', 4, 'Ticker', 'Company', 'Sector', '.PA', 'Europe', 'Euronext Paris')
    print(f"Got {len(cac)} CAC 40")
    
    print("Fetching Russell 1000 (US)...")
    russell1000 = fetch_table('https://en.wikipedia.org/wiki/Russell_1000_Index', 3, 'Symbol', 'Company', 'GICS Sector', '', 'US', 'US')
    print(f"Got {len(russell1000)} Russell 1000")

    print("Fetching NASDAQ 100 (US)...")
    nasdaq100 = fetch_table('https://en.wikipedia.org/wiki/Nasdaq-100', 4, 'Ticker', 'Company', 'GICS Sector', '', 'US', 'NASDAQ')
    print(f"Got {len(nasdaq100)} NASDAQ 100")

    print("Fetching FTSE 100 (UK)...")
    ftse100 = fetch_table('https://en.wikipedia.org/wiki/FTSE_100_Index', 6, 'Ticker', 'Company', 'FTSE industry classification benchmark sector[38]', '.L', 'Europe', 'LSE')
    print(f"Got {len(ftse100)} FTSE 100")

    print("Fetching AEX (Netherlands)...")
    aex = fetch_table('https://en.wikipedia.org/wiki/AEX_index', 3, 'Ticker', 'Company', 'ICB Sector', '.AS', 'Europe', 'Euronext Amsterdam')
    print(f"Got {len(aex)} AEX")

    print("Fetching BSE SENSEX (India)...")
    sensex = fetch_table('https://en.wikipedia.org/wiki/BSE_SENSEX', 2, 'Symbol', 'Company', 'Industry', '.BO', 'Asia', 'BSE')
    print(f"Got {len(sensex)} BSE SENSEX")
    
    # ── BIG ETF LIST MANUALLY DEFINED ──
    more_etfs = {
        # World
        "VTI": {"name": "Vanguard Total Stock Market", "index_tracked": "CRSP US Total Market", "ter": 0.0003, "domicile": "US", "category": "Equity US Broad", "region": "US", "exchange": "NYSE"},
        "VT": {"name": "Vanguard Total World Stock", "index_tracked": "FTSE Global All Cap", "ter": 0.0007, "domicile": "US", "category": "Equity World", "region": "World", "exchange": "NYSE"},
        "VXUS": {"name": "Vanguard Total International", "index_tracked": "FTSE Global All Cap ex US", "ter": 0.0008, "domicile": "US", "category": "Equity World ex-US", "region": "World", "exchange": "NASDAQ"},
        "VEA": {"name": "Vanguard Developed Markets", "index_tracked": "FTSE Developed All Cap ex US", "ter": 0.0005, "domicile": "US", "category": "Equity Developed Markets", "region": "World", "exchange": "NYSE"},
        "VIG": {"name": "Vanguard Dividend Appreciation", "index_tracked": "S&P US Dividend Growers", "ter": 0.0006, "domicile": "US", "category": "Equity US Dividend", "region": "US", "exchange": "NYSE"},
        "VYM": {"name": "Vanguard High Dividend Yield", "index_tracked": "FTSE High Dividend Yield", "ter": 0.0006, "domicile": "US", "category": "Equity US Dividend", "region": "US", "exchange": "NYSE"},
        "SCHD": {"name": "Schwab US Dividend Equity", "index_tracked": "Dow Jones US Dividend 100", "ter": 0.0006, "domicile": "US", "category": "Equity US Dividend", "region": "US", "exchange": "NYSE"},
        "VOO": {"name": "Vanguard S&P 500 ETF", "index_tracked": "S&P 500", "ter": 0.0003, "domicile": "US", "category": "Equity US Large Cap", "region": "US", "exchange": "NYSE"},
        "IVV": {"name": "iShares Core S&P 500", "index_tracked": "S&P 500", "ter": 0.0003, "domicile": "US", "category": "Equity US Large Cap", "region": "US", "exchange": "NYSE"},
        "QQQM": {"name": "Invesco NASDAQ 100", "index_tracked": "NASDAQ-100", "ter": 0.0015, "domicile": "US", "category": "Equity US Tech", "region": "US", "exchange": "NASDAQ"},
        "TQQQ": {"name": "ProShares UltraPro QQQ", "index_tracked": "NASDAQ-100", "ter": 0.0095, "domicile": "US", "category": "Equity US Tech Leveraged", "region": "US", "exchange": "NASDAQ"},
        "SQQQ": {"name": "ProShares UltraPro Short QQQ", "index_tracked": "NASDAQ-100", "ter": 0.0095, "domicile": "US", "category": "Equity US Tech Inverse", "region": "US", "exchange": "NASDAQ"},
        "SPXL": {"name": "Direxion Daily S&P 500 Bull 3X", "index_tracked": "S&P 500", "ter": 0.010, "domicile": "US", "category": "Equity US Broad Leveraged", "region": "US", "exchange": "NYSE"},
        "SPXS": {"name": "Direxion Daily S&P 500 Bear 3X", "index_tracked": "S&P 500", "ter": 0.010, "domicile": "US", "category": "Equity US Broad Inverse", "region": "US", "exchange": "NYSE"},

        # Europe UCITS Extra
        "SXR8.DE": {"name": "iShares Core S&P 500 UCITS", "index_tracked": "S&P 500", "ter": 0.0007, "domicile": "Ireland", "category": "Equity US Large Cap", "region": "US", "exchange": "XETRA"},
        "EMIM.L": {"name": "iShares Core MSCI EM IMI", "index_tracked": "MSCI EM IMI", "ter": 0.0018, "domicile": "Ireland", "category": "Equity Emerging Markets", "region": "Asia", "exchange": "London"},
        "IS3N.DE": {"name": "iShares Core MSCI EM IMI", "index_tracked": "MSCI EM IMI", "ter": 0.0018, "domicile": "Ireland", "category": "Equity Emerging Markets", "region": "Asia", "exchange": "XETRA"},
        "XDWD.DE": {"name": "Xtrackers MSCI World UCITS", "index_tracked": "MSCI World", "ter": 0.0019, "domicile": "Ireland", "category": "Equity World", "region": "World", "exchange": "XETRA"},
        "CW8.PA": {"name": "Amundi MSCI World UCITS", "index_tracked": "MSCI World", "ter": 0.0038, "domicile": "France", "category": "Equity World", "region": "World", "exchange": "Euronext Paris"},
        "PUST.PA": {"name": "Amundi PEA NASDAQ-100", "index_tracked": "NASDAQ-100", "ter": 0.0030, "domicile": "France", "category": "Equity US Tech", "region": "US", "exchange": "Euronext Paris"},

        # Bonds Extra
        "BND": {"name": "Vanguard Total Bond Market", "index_tracked": "Bloomberg US Aggregate Float", "ter": 0.0003, "domicile": "US", "category": "Bond US Broad", "region": "US", "exchange": "NASDAQ"},
        "AGG": {"name": "iShares Core US Aggregate Bond", "index_tracked": "Bloomberg US Aggregate", "ter": 0.0003, "domicile": "US", "category": "Bond US Broad", "region": "US", "exchange": "NYSE"},
        "LQD": {"name": "iShares iBoxx $ Inv Grade Corp", "index_tracked": "Markit iBoxx USD Liquid", "ter": 0.0014, "domicile": "US", "category": "Bond US Corp", "region": "US", "exchange": "NYSE"},
        "HYG": {"name": "iShares iBoxx $ High Yield", "index_tracked": "Markit iBoxx USD Liquid High Yield", "ter": 0.0049, "domicile": "US", "category": "Bond US High Yield", "region": "US", "exchange": "NYSE"},
        "JNK": {"name": "SPDR Bloomberg High Yield", "index_tracked": "Bloomberg High Yield Very Liquid", "ter": 0.0040, "domicile": "US", "category": "Bond US High Yield", "region": "US", "exchange": "NYSE"},

        # Commodities Extra
        "IAU": {"name": "iShares Gold Trust", "index_tracked": "Gold Spot Price", "ter": 0.0025, "domicile": "US", "category": "Commodity Gold", "region": "World", "exchange": "NYSE"},
        "USO": {"name": "United States Oil Fund", "index_tracked": "WTI Crude Oil", "ter": 0.0083, "domicile": "US", "category": "Commodity Oil", "region": "World", "exchange": "NYSE"},
        "UNG": {"name": "United States Natural Gas", "index_tracked": "Natural Gas", "ter": 0.012, "domicile": "US", "category": "Commodity Gas", "region": "World", "exchange": "NYSE"},

        # Real Estate
        "VNQ": {"name": "Vanguard Real Estate ETF", "index_tracked": "MSCI US Investable Market RE", "ter": 0.0012, "domicile": "US", "category": "Real Estate US", "region": "US", "exchange": "NYSE"},
        "VNQI": {"name": "Vanguard Global ex-US Real Estate", "index_tracked": "S&P Global ex-US Property", "ter": 0.0012, "domicile": "US", "category": "Real Estate Global", "region": "World", "exchange": "NASDAQ"},
        "IYR": {"name": "iShares US Real Estate ETF", "index_tracked": "Dow Jones US Real Estate", "ter": 0.0039, "domicile": "US", "category": "Real Estate US", "region": "US", "exchange": "NYSE"},
        
        # Sectors
        "XLY": {"name": "Consumer Discretionary Select", "index_tracked": "S&P Consumer Discretionary", "ter": 0.0009, "domicile": "US", "category": "Sector Consumer", "region": "US", "exchange": "NYSE"},
        "XLP": {"name": "Consumer Staples Select", "index_tracked": "S&P Consumer Staples", "ter": 0.0009, "domicile": "US", "category": "Sector Consumer Staples", "region": "US", "exchange": "NYSE"},
        "XLU": {"name": "Utilities Select Sector SPDR", "index_tracked": "S&P Utilities", "ter": 0.0009, "domicile": "US", "category": "Sector Utilities", "region": "US", "exchange": "NYSE"},
        "XLB": {"name": "Materials Select Sector SPDR", "index_tracked": "S&P Materials", "ter": 0.0009, "domicile": "US", "category": "Sector Materials", "region": "US", "exchange": "NYSE"},
        "XLC": {"name": "Communication Services Select", "index_tracked": "S&P Communication Services", "ter": 0.0009, "domicile": "US", "category": "Sector Communication", "region": "US", "exchange": "NYSE"},
        "XLRE": {"name": "Real Estate Select Sector SPDR", "index_tracked": "S&P Real Estate", "ter": 0.0009, "domicile": "US", "category": "Sector Real Estate", "region": "US", "exchange": "NYSE"}
    }
    
    # ── CRYPTOS EXTRAS (Treated as ETFS/Stocks but they're pure assets) ──
    # Since yfinance supports them:
    cryptos = {
        "BTC-USD": {"name": "Bitcoin USD", "sector": "Cryptocurrency", "region": "World", "exchange": "Crypto"},
        "ETH-USD": {"name": "Ethereum USD", "sector": "Cryptocurrency", "region": "World", "exchange": "Crypto"},
        "BNB-USD": {"name": "Binance Coin", "sector": "Cryptocurrency", "region": "World", "exchange": "Crypto"},
        "SOL-USD": {"name": "Solana", "sector": "Cryptocurrency", "region": "World", "exchange": "Crypto"},
        "XRP-USD": {"name": "XRP", "sector": "Cryptocurrency", "region": "World", "exchange": "Crypto"},
        "ADA-USD": {"name": "Cardano", "sector": "Cryptocurrency", "region": "World", "exchange": "Crypto"},
        "DOGE-USD": {"name": "Dogecoin", "sector": "Cryptocurrency", "region": "World", "exchange": "Crypto"}
    }

    all_extra_stocks = {}
    for dic in [sp500, mid400, small600, tsx60, dax, cac, russell1000, nasdaq100, ftse100, aex, sensex, cryptos]:
        all_extra_stocks.update(dic)

    with open('c:/Users/Antoine/Desktop/BotBourse/python/extra_universe.py', 'w', encoding='utf-8') as f:
        f.write('# This file is auto-generated\n')
        f.write('EXTRA_STOCKS = ' + json.dumps(all_extra_stocks, indent=4, ensure_ascii=False) + '\n\n')
        f.write('EXTRA_ETFS = ' + json.dumps(more_etfs, indent=4, ensure_ascii=False) + '\n')

if __name__ == "__main__":
    main()
