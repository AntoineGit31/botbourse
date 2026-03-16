# 📈 BotBourse

**BotBourse** est une plateforme moderne d'analyse financière et de prédictions boursières. Propulsée par l'Intelligence Artificielle et le Machine Learning, l'application analyse quotidiennement un vaste univers de plus de 800 actifs (Actions Internationales, ETFs, et Cryptomonnaies) pour fournir des indicateurs de tendance et des scores de confiance aux investisseurs.

![BotBourse Preview](https://botbourse.vercel.app/og.png)

---

## 🚀 Fonctionnalités Principales

- **🤖 Prédictions IA Quotidiennes :** Nos modèles de Machine Learning (*LightGBM*) tournent tous les jours pour prédire les mouvements à court, moyen et long terme (+30, 252 et 756 jours).
- **🌍 Vaste Univers d'Actifs :** Suivi automatisé du S&P 500, NASDAQ, CAC 40, DAX, actions Asiatiques, ETFs sectoriels/mondiaux et Cryptomonnaies majeures.
- **📊 Graphiques Interactifs :** Intégration de [Lightweight Charts](https://fr.tradingview.com/lightweight-charts/) par TradingView pour analyser la performance historique et en direct des actions. 
- **🎯 Screener Avancé :** Triez les centaines d'actifs selon le score IA, le sentiment, les rendements attendus et le risque.
- **📡 Cotations en Direct :** Les prix sont mis à jour en temps réel lors de l'ouverture des marchés.
- **👥 Comptes Utilisateurs & Watchlist :** Connectez-vous via *Clerk* pour créer et sauvegarder vos listes d'actifs préférés sur notre base de données Neon PostgreSQL.
- **⏱️ Automatisation Complète :** L'entièreté de l'analyse (Machine learning, parsing de données) et le déploiement sont automatisés via des **GitHub Actions** chaque matin à 8h00 UTC.

---

## 🛠️ Stack Technique

- **Frontend :** [Next.js 14](https://nextjs.org/) (App Router), React, TailwindCSS.
- **Backend & Données :** Python 3 (Pandas, yfinance, LightGBM, scikit-learn).
- **Base de données :** [Neon](https://neon.tech/) (PostgreSQL sans serveur).
- **Authentification :** [Clerk](https://clerk.com/).
- **Déploiement :** [Vercel](https://vercel.com/) (Site Internet) & GitHub Actions (Génération des données IA).

---

## 💻 Installation & Démarrage en Local

Vous souhaitez lancer BotBourse sur votre propre ordinateur ou contribuer au projet ? C'est très simple :

1. **Cloner le répertoire :**
   ```bash
   git clone https://github.com/AntoineGit31/botbourse.git
   cd botbourse
   ```

2. **Générer les données IA manuellement (Optionnel) :**
   Double-cliquez sur le fichier `update-data.bat` à la racine pour lancer le scraper localement et les prédictions (cela peut prendre jusqu'à 20 minutes pour les 800 actions).
   *Note : Le dossier public contient généralement déjà les données à jour du matin même.*

3. **Lancer le serveur Web de développement :**
   Double-cliquez sur `start.bat` à la racine.
   *(Ou tapez `npm run dev` dans votre terminal).*

Le serveur se lancera sur [http://localhost:3000](http://localhost:3000).

---

## ⚖️ Avertissement Légal
BotBourse est un projet à but éducatif et informatif. Les prédictions générées par l'IA ou les signaux fournis par la plateforme **ne constituent en aucun cas des conseils en investissement financier**. Le marché boursier comporte des risques de perte en capital. Menez toujours vos propres recherches avant d'investir.
