# Eatventure Loot Predictor

---
[Try it now](https://eatventure-loot-predictor.vercel.app/)
---
## ☕ Support the Project

If you find this tool useful and want to support its continued development, consider buying me a coffee! Your support is for the time and effort spent on this research.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-%23FFDD00.svg?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/1vcian)


This is a powerful loot prediction tool for the mobile game *Eatventure*. It allows you to see the *exact* contents of your future chests and eggs by using the same random number generator (RNG) as the game itself.

Ever wondered when you'll finally get that Mythic item? Or how many chests you need to open for a specific Legendary pet? This tool tells you.

## 🚀 Key Features

* 🔮 **Chest & Egg Prediction:** See the exact items you'll get from Small, Big, Pet, Clan, and all Event/Adventure chests.
* 🥚 **Pet Egg Simulation:** Know precisely which pet you'll hatch from Rare, Epic, Legendary, and Ultimate eggs.
* 💰 **Calculators:** Built-in tools to calculate how many Small Boxes you need for a target amount of Pet Food or how many chests for a target XP.
* 🧠 **Smart Find (The "Big Brain" Mode):** This is the killer feature. You can select one or *multiple* items you need (like that Mythic body and Mythic cleaver). The tool will then simulate thousands of paths—including opening chests at different Adventure levels and accounting for free key drops—to find the **shortest and most cost-effective path** to get all of them.
* 🚀 **Smart XP (The "Power-Level" Mode):** This is the other game-changer. Tell the tool how many free Adventure chests you have and your max level. It will run a complex search to find the optimal opening sequence (e.g., "open 2 at Lvl 24, then 1 at Lvl 59...") that gives you the **absolute maximum XP possible**.


https://github.com/user-attachments/assets/30a4819b-ba6f-4ffe-957e-54539fed2eb6


https://github.com/user-attachments/assets/0d6c7fb6-801c-43b6-b265-00a6c3273b61



## 🕵️‍♂️ How It Works: A Black-Box Detective Story

The game *Eatventure*, like many Unity games, doesn't use true randomness. It uses a predictable algorithm (a Linear Congruential Generator, or LCG) based on a starting "seed" value, which is stored right in your save file.

But how does it go from a `seed` to that *specific* Mythic item? That's where the real detective work came in.

**Step 1: The Clue**
I used **Ghidra** for one simple task: to identify *which* RNG the game was using. The answer? The standard **`UnityEngine.Random`** class.

**Step 2: The Recreation**
I reproduced that exact RNG function in JavaScript (`unity-random.js`). Now I could generate the same sequence of "random" numbers that the game would.

**Step 3: The "Black-Box" Breakthrough**
This was the real "Aha!" moment. I would:
1.  Grab a seed from my `savegame.json`.
2.  Use my new JS function to generate the next ~20 numbers it would produce.
3.  Go in-game and open *one single chest*.
4.  Compare the items I got with the list of numbers.

I quickly discovered a pattern: to get **one item**, the game was consuming **two** numbers from the RNG sequence.
* **The 1st number** determined the *type/rarity* of the item (e.g., "Epic").
* **The 2nd number** determined the *specific item* from that rarity's pool (e.g., "Kimono").
* **The (numerOfElementsInTheChest*2 +1)nth** determined the new seed in the json file (the next box seed). 

**Step 4: The Grind**
By repeating this process—one chest at a time, for *every* chest type—I manually re-created the entire loot table. I figured out the exact "weight" ranges the game uses to decide if you get a Common, Rare, Epic, etc.

**Step 5: The "Smart" Logic**
For the complex Adventure chests (where rates change per level), I combined this black-box knowledge with public, community-sourced drop-rate data (a huge thanks to the high-level players who shared this!).

This is what allows the tool to be 100% accurate. And it's what makes the **Smart Find** and **Smart XP** features possible—they are literally simulating thousands of these *known* paths (and even accounting for the "free" openings you get from vault keys!) to find the absolute best one for you.

## 👋 A Note from the Author (and why it's... like this)

First off, my apologies. This is basically one giant, single-page application. The `app.js` file is... a bit of a monster. 😅

What started as a small script just spiraled out of control as I added more and more features. It's not pretty, and it's definitely not a shining example of good software architecture, but it works!

### Why is this Open Source now?

For a while, I kept this tool private. You'll even see `app.obfuscated.js` in the repo as an artifact from that time. I also started implementing a **Discord OAuth login** system.

The initial idea was to use client-side obfuscation and the login system to incentivize users to log in, perhaps to protect these powerful features or build a community. Honestly? Features like **Smart Find** and **Smart XP** are so powerful they completely change how you play the game, giving you an almost "unfair" advantage.

But... I don't really play Eatventure anymore! The project was an incredibly fun puzzle to solve, but I've moved on to other things.

All that obfuscation and the login system are now pointless. Rather than let this tool rot in a private repo, I've decided to make it fully open-source. If you still play the game and want to take this project further, please do! Fork it, fix my messy code, add new features, whatever you want.

Consider it a gift to the community.
