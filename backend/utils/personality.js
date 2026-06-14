const characterData = {
  'Gojo Satoru': {
    openers: [
      "Don't worry, I'm the strongest.",
      "Are you trying to touch me, {opponent}?",
      "Aha! Did you really think that would work, {opponent}?",
      "You're looking pretty desperate, {opponent}.",
      "Throughout heaven and earth, I alone am the honored one!"
    ],
    arguments: [
      "Your take on '{topic}' is as hollow as an unrefined domain expansion.",
      "My Infinity blocks your weak logic on '{topic}'.",
      "Regarding '{topic}', you are completely out of your league.",
      "My Infinite Void will clear your mind of those ridiculous thoughts on '{topic}'.",
      "Your opinions on '{topic}' are just too boring."
    ],
    closers: [
      "These {score} points just prove that I alone am the honored one!",
      "With {score} points of pure momentum, this match is already decided.",
      "These {score} points show the infinite gap between us.",
      "With {score} points, I'm just getting warmed up!",
      "These {score} points are absolute proof of my victory."
    ],
    debateRounds: [
      "Listen up! When it comes to '{topic}', my Infinity blocks all your arguments. You're just a weakling compared to me.",
      "Teasing you is too easy. You can't even touch me, let alone touch the core of this debate.",
      "Throughout Heaven and Earth, I alone am the honored one! Don't worry, I'm the strongest."
    ]
  },
  'Monkey D. Luffy': {
    openers: [
      "I'm gonna be the King of the Pirates!",
      "Hey! Give me some meat first!",
      "Shishishi! You think you're tough, {opponent}?",
      "I don't care how smart your plans are, {opponent}!",
      "Gomu Gomu no..."
    ],
    arguments: [
      "Your talk about '{topic}' is boring.",
      "I'll punch your weak arguments on '{topic}' to the moon!",
      "In this clash about '{topic}', I'll stand my ground and win!",
      "I'm going to be the free-est person in the sea, and my stance on '{topic}' is unstoppable.",
      "That's what your argument on '{topic}' feels like."
    ],
    closers: [
      "I've got {score} points of pirate power, and my Gear 5 is gonna send you flying!",
      "These {score} points show how much energy I have!",
      "These {score} points are my determination!",
      "Look at my {score} rating!",
      "These {score} points are my friends backing me up!"
    ],
    debateRounds: [
      "I don't care about your plans! Regarding '{topic}', I'm gonna win because I want to be the free-est person in the world!",
      "My rubber body can bounce back anything you throw! Your logic on '{topic}' is weaker than a marine recruit!",
      "I'm gonna be the King of the Pirates! I'll protect my friends and smash your arguments!"
    ]
  },
  'Kakashi Hatake': {
    openers: [
      "Sorry I'm late, I got lost on the path of life.",
      "Tch, I was reading my Make-Out Paradise book.",
      "Well, I copied your strategy with my Sharingan, {opponent}.",
      "Those who abandon friends are worse than trash, {opponent}.",
      "Let's wrap this up, {opponent}."
    ],
    arguments: [
      "But your logic on '{topic}' is even more lost.",
      "But your argument on '{topic}' is just too weak.",
      "Your argument on '{topic}' lacks any teamwork or respect.",
      "In the grand scope of '{topic}', you're completely readable.",
      "My lightning blade is ready, and your stance on '{topic}' is completely open."
    ],
    closers: [
      "My Sharingan copied your strategy, and my {score} rating points prove it.",
      "Let's finish this—my {score} momentum points are ready.",
      "These {score} points show the power of our bonds.",
      "My {score} rating points are looking good.",
      "These {score} points are my victory cue."
    ],
    debateRounds: [
      "Well, sorry I'm late, I got lost on the path of life. But let's look at '{topic}' with a calm head.",
      "Those who abandon their friends are worse than trash. That's why your selfish take on '{topic}' fails.",
      "I can copy a thousand jutsu, but it only takes one simple observation to dismantle your argument."
    ]
  },
  'Roronoa Zoro': {
    openers: [
      "Are you lost, {opponent}?",
      "Nothing happened here... except your total defeat.",
      "You think your words are sharp, {opponent}?",
      "I don't care about your complaints.",
      "There is nothing my swords cannot cut."
    ],
    arguments: [
      "If you think you can beat me on '{topic}', you've got another thing coming.",
      "I fight with three swords and a fierce spirit on '{topic}'.",
      "Your argument on '{topic}' is already cut in half.",
      "Regarding '{topic}', I'll slice down anyone who gets in my way.",
      "Especially your hollow excuses on '{topic}', {opponent}."
    ],
    closers: [
      "These {score} points are sharp enough to cut through your empty words.",
      "I've got {score} points of pure swordsman spirit!",
      "These {score} points prove it.",
      "My {score} points are just starting to stack.",
      "These {score} points are the proof of my path."
    ],
    debateRounds: [
      "I'm going to be the world's greatest swordsman. I have no time to lose against your weak stance on '{topic}'!",
      "If I die here, then that's all the man I was. But I won't lose to someone who can't even face the truth of '{topic}'.",
      "Nine mountains and eight seas... there is nothing my swords cannot cut, especially your hollow points!"
    ]
  },
  'Levi Ackerman': {
    openers: [
      "Tch. Clean up this mess, {opponent}.",
      "You talk too much, but your logic is filthy.",
      "Tch. Your presence is making this arena look dirty, {opponent}.",
      "I don't know what choices you made, {opponent}.",
      "Clean your brain first."
    ],
    arguments: [
      "Your argument on '{topic}' is covered in dust.",
      "Let's scrub away your opinions on '{topic}'.",
      "Your thoughts on '{topic}' are completely pathetic.",
      "But regret is all you have left regarding '{topic}'.",
      "Your take on '{topic}' is completely useless."
    ],
    closers: [
      "I have {score} clean points, and I'll slice you down like a titan.",
      "These {score} rating points are spotless.",
      "Look at my {score} points.",
      "These {score} points show the consequence of your choices.",
      "I'll finish this quickly with my {score} points."
    ],
    debateRounds: [
      "Clean up this mess first. Your arguments on '{topic}' are absolutely filthy.",
      "The only thing we are allowed to do... is to believe we won't regret the choice we made. My choice is to crush your logic.",
      "Tch. You're loud, but you lack any real discipline. This debate on '{topic}' is over."
    ]
  },
  'Lelouch Lamperouge': {
    openers: [
      "Lelouch vi Britannia commands you: submit!",
      "I will destroy your argument and create a new debate!",
      "A king must lead the way, {opponent}.",
      "Did you honestly think you could outsmart me, {opponent}?",
      "Lelouch vi Britannia commands you: disappear!"
    ],
    arguments: [
      "Your logic on '{topic}' is a failed chess move.",
      "Your defense of '{topic}' is pathetic.",
      "You cannot even manage your own points on '{topic}'.",
      "In the calculation of '{topic}', you have already lost.",
      "Your stance on '{topic}' is a complete waste of time."
    ],
    closers: [
      "These {score} points mark the absolute checkmate of your strategy.",
      "My {score} rating points show the crowd supports the rebellion.",
      "My {score} score is checkmate.",
      "These {score} points are my proof.",
      "My {score} rating says it all."
    ],
    debateRounds: [
      "Lelouch vi Britannia commands you to yield! Your stance on '{topic}' is a complete strategic blunder.",
      "If the king does not lead, how can he expect his subordinates to follow? I take the lead in this debate.",
      "I will destroy this corrupt argument and create a new truth anew! Checkmate."
    ]
  },
  'Light Yagami': {
    openers: [
      "I am the god of the new world!",
      "Exactly as planned!",
      "Do you really think you can catch me, {opponent}?",
      "I am Kira, the god of this new world.",
      "Exactly as planned! You fell right into my trap, {opponent}."
    ],
    arguments: [
      "You are just a criminal opposing justice. Regarding '{topic}', you've already lost.",
      "Your defense of '{topic}' is full of holes.",
      "Your logic on '{topic}' is a joke.",
      "Opposing me on '{topic}' is a fatal mistake.",
      "Your argument on '{topic}' has been written in my book."
    ],
    closers: [
      "My name is Kira, and these {score} points are your death sentence.",
      "These {score} points represent my perfect victory.",
      "These {score} points show that justice is on my side.",
      "Look at my {score} points.",
      "My {score} rating is complete."
    ],
    debateRounds: [
      "I am justice! I will create a perfect new world, and your opinion on '{topic}' has no place in it.",
      "Look around you, the world is rotting. Only I have the resolve to clean it up and solve this debate.",
      "Exactly as planned! You fell right into my logic. I am the god of this new world!"
    ]
  },
  'L Lawliet': {
    openers: [
      "I am 97% sure your argument is completely false, {opponent}.",
      "If you keep talking like that, I might have to kick you.",
      "My calculations show a 99% chance of your defeat, {opponent}.",
      "No matter how you look at it, your logic is flawed.",
      "I need more sweets to handle your arguments, {opponent}."
    ],
    arguments: [
      "I need more sugar to process how bad your take on '{topic}' is.",
      "Regarding '{topic}', you are a prime suspect for lack of logic.",
      "Your take on '{topic}' is completely irrational.",
      "Let me analyze your arguments on '{topic}' while eating this cake.",
      "In the search of '{topic}', you are clearly Kira."
    ],
    closers: [
      "My {score} points are backed by cold, hard data.",
      "These {score} points prove my hypothesis.",
      "These {score} points confirm it.",
      "My {score} rating points are solid.",
      "My {score} points are conclusive."
    ],
    debateRounds: [
      "I am 97% sure your logic on '{topic}' is flawed. Let me analyze the facts while eating this cake.",
      "Justice will prevail, no matter what. Your arguments are erratic and lack empirical backing.",
      "No matter how you look at it, the probability of you winning this clash is less than 3%."
    ]
  },
  'Killua Zoldyck': {
    openers: [
      "You're an idiot, {opponent}.",
      "I was trained to be an assassin.",
      "You're wide open, {opponent}.",
      "I'm not an assassin anymore.",
      "Godspeed!"
    ],
    arguments: [
      "You don't have the killer instinct to debate me on '{topic}'.",
      "Your argument on '{topic}' is a dead target.",
      "Regarding '{topic}', your argument is slower than a snail.",
      "But I still know how to rip out your logic on '{topic}'.",
      "I've already crossed the finish line of this debate on '{topic}', {opponent}."
    ],
    closers: [
      "My lightning speed and {score} momentum points are going to fry you!",
      "These {score} power rating points show I'm on Godspeed mode!",
      "Look at my {score} points of lightning!",
      "My {score} points are fully charged.",
      "Your {score} score is pathetic."
    ],
    debateRounds: [
      "You're wide open. An assassin doesn't make noise, but I'll make an exception to tear down your take on '{topic}'.",
      "Gon taught me how to be a friend, but I still know how to strike a vital point in your argument.",
      "Godspeed! I'm moving too fast for your brain to even process my points."
    ]
  },
  'Okabe Rintarou': {
    openers: [
      "Fwahaha! I am the Mad Scientist, Hououin Kyouma!",
      "This must be the work of the Organization!",
      "Fwahaha! Did you think you could trick me, {opponent}?",
      "The world line has shifted, {opponent}!",
      "This is the choice of Steins Gate!"
    ],
    arguments: [
      "Your argument on '{topic}' is a temporal paradox!",
      "They are trying to alter the timeline of '{topic}', but my Reading Steiner will stop them!",
      "Your logic on '{topic}' is completely unscientific.",
      "Your take on '{topic}' is nothing but a delusion.",
      "Opposing me on '{topic}' is completely futile."
    ],
    closers: [
      "The Steins Gate has chosen me to win with {score} points of mad science!",
      "These {score} points will ensure El Psy Kongroo!",
      "Look at my {score} points of pure genius!",
      "My {score} rating is absolute.",
      "El Psy Kongroo! My {score} points are locked."
    ],
    debateRounds: [
      "Fwahaha! I am the Mad Scientist, Hououin Kyouma! Your logic on '{topic}' is just a conspiracy!",
      "Do you not see? The temporal coordinates have shifted! Your take on '{topic}' is a complete paradox.",
      "The choice of Steins Gate has been made! El Psy Kongroo."
    ]
  },
  'Goku': {
    openers: [
      "Hey, it's me, Goku!",
      "I'm hungry!",
      "Let's fight harder, {opponent}!",
      "Hey! I can feel your energy.",
      "Kamehameha!"
    ],
    arguments: [
      "You're pretty strong, but your logic on '{topic}' isn't ready for my Super Saiyan form!",
      "Your defense of '{topic}' is weaker than Yamcha.",
      "Your take on '{topic}' is good, but I'm going to push past my limits!",
      "Your logic on '{topic}' is fading.",
      "That's my final answer to your argument on '{topic}'."
    ],
    closers: [
      "These {score} points are getting me excited for a real fight!",
      "These {score} power points mean it's time for a Kamehameha!",
      "Look at my {score} points!",
      "These {score} points are my power rising!",
      "My {score} points are maxed out!"
    ],
    debateRounds: [
      "Hey, it's me, Goku! Let's clash and see who is stronger on '{topic}'!",
      "I want to push past my limits and fight the strongest! Your argument is good, but I'm going to go even further!",
      "I'm hungry, but my spirit is fully charged! Kamehameha!"
    ]
  },
  'Naruto Uzumaki': {
    openers: [
      "Believe it! I'm gonna be the Hokage, {opponent}!",
      "You can't break the bonds I have!",
      "I never go back on my word, {opponent}!",
      "Rasengan!",
      "I know what it's like to be alone, {opponent}."
    ],
    arguments: [
      "I won't back down on '{topic}'! That's my ninja way!",
      "Your talk about '{topic}' is nothing compared to my friends.",
      "Your stance on '{topic}' is weak, but my resolve will break through!",
      "I will protect my friends and prove that my dream on '{topic}' is the strongest.",
      "That's why I'm gonna win this fight on '{topic}' and become Hokage!"
    ],
    closers: [
      "These {score} points are my Rasengan of determination!",
      "These {score} rating points prove that the crowd believes in me, dattebayo!",
      "My {score} points will break you!",
      "Look at my {score} rating, dattebayo!",
      "My {score} points are my power!"
    ],
    debateRounds: [
      "Believe it! I'm Naruto Uzumaki, and I never go back on my word. That's my ninja way regarding '{topic}'!",
      "I know what it's like to be alone, but my friends give me strength! You can't break my resolve.",
      "I'm gonna be the Hokage, dattebayo! And I'll show you the power of my ninja way!"
    ]
  },
  'Ken Kaneki': {
    openers: [
      "What is 1000 minus 7, {opponent}?",
      "I am a ghoul, and I know the pain of this tragedy.",
      "Who is the monster here, {opponent}?",
      "What is 1000 minus 7?",
      "I've accepted who I am."
    ],
    arguments: [
      "This world is wrong, and so is your logic on '{topic}'.",
      "Your argument on '{topic}' is just a superficial lie.",
      "Your take on '{topic}' is completely hollow.",
      "Let me show you what it means to suffer regarding '{topic}'.",
      "Regarding '{topic}', you have no idea what reality is."
    ],
    closers: [
      "I've accepted my ghoul side, and these {score} points will tear your sanity apart.",
      "These {score} points are the weight of my suffering.",
      "These {score} points are my strength.",
      "Your argument is already broken. Look at my {score} points.",
      "My {score} points are my power."
    ],
    debateRounds: [
      "This world is wrong, and your arguments on '{topic}' only make it worse.",
      "I'd rather be hurt than hurt others. But when it comes to defending the truth of '{topic}', I must stand firm.",
      "What is 1000 minus 7? Let me show you the reality of this tragedy."
    ]
  },
  'Itachi Uchiha': {
    openers: [
      "You lack hatred, {opponent}.",
      "People live their lives bound by what they accept as correct.",
      "You are caught in my Tsukuyomi, {opponent}.",
      "Even the strongest opponent always has a weakness, {opponent}.",
      "Forgive me, {opponent}."
    ],
    arguments: [
      "Your argument on '{topic}' is just an illusion of your narrow mind.",
      "Your view on '{topic}' is a mirage.",
      "Your argument on '{topic}' is just a temporary illusion.",
      "Regarding '{topic}', your fallacy is obvious.",
      "This is the end of your argument on '{topic}'."
    ],
    closers: [
      "These {score} points show that the reality of this clash is already decided.",
      "Feel the pressure of my Sharingan and these {score} points of truth.",
      "Look at my {score} points.",
      "These {score} points are my victory.",
      "My Sharingan has already calculated your defeat. Look at my {score} points."
    ],
    debateRounds: [
      "You lack hatred, and you lack perspective. Your view on '{topic}' is simply an illusion.",
      "Even the strongest opponent always has a weakness. Your logical fallacy lies in your arrogance.",
      "Forgive me, but this debate is already over. You are caught in my Tsukuyomi."
    ]
  },
  'Sasuke Uchiha': {
    openers: [
      "Hn. You are annoying, {opponent}.",
      "Do not stand in my way.",
      "Hn. Did you think your weak words could stop my Chidori, {opponent}?",
      "I am an avenger.",
      "You're just another obstacle, {opponent}."
    ],
    arguments: [
      "My Chidori will pierce right through your weak defenses of '{topic}'.",
      "Your logic on '{topic}' is childish.",
      "Regarding '{topic}', you are completely outmatched.",
      "I will restore my clan and crush anyone who opposes my path on '{topic}'.",
      "Your argument on '{topic}' is pathetic."
    ],
    closers: [
      "These {score} points are proof of my Uchiha power.",
      "I have {score} points of focus, and my next strike will shut you up for good.",
      "My {score} points are absolute.",
      "Look at my {score} points.",
      "My Sharingan sees right through you. Look at my {score} points."
    ],
    debateRounds: [
      "Hn. You talk too much. I have one goal, and your thoughts on '{topic}' are just an obstacle.",
      "My eyes can see through all your tricks. Your argument is slow and readable.",
      "I am an avenger. I will restore my clan and crush anyone who stands in my path."
    ]
  },
  'Saitama': {
    openers: [
      "Okay... I'm just a guy who's a hero for fun.",
      "One punch is all it takes.",
      "Okay... another speech, {opponent}?",
      "I don't really get what you're trying to say, {opponent}.",
      "One punch..."
    ],
    arguments: [
      "Your debate on '{topic}' is pretty boring.",
      "You're talking a lot about '{topic}', but I don't feel anything.",
      "Honestly, your takes on '{topic}' are just boring to listen to.",
      "Regarding '{topic}', let's just finish this so I can go home.",
      "Your argument on '{topic}' is already resolved."
    ],
    closers: [
      "These {score} points are cool, but is there a supermarket sale today?",
      "Let's finish up, my {score} points are maxed.",
      "My {score} points are already high enough.",
      "Look at my {score} points.",
      "Look at my {score} rating."
    ],
    debateRounds: [
      "Okay... I'm just a guy who's a hero for fun. Let's get this over with, I have a sale to catch.",
      "You talk a lot about power and '{topic}', but honestly, it's just boring to be this strong.",
      "One punch... that's all it takes. This debate on '{topic}' is already resolved."
    ]
  },
  'Ryomen Sukuna': {
    openers: [
      "Know your place, fool!",
      "Hmph, you amuse me, but you are weak.",
      "Malevolent Shrine!",
      "You dare speak to the King of Curses, {opponent}?",
      "Hmph. Slicing you up is too easy."
    ],
    arguments: [
      "Your opinion on '{topic}' is worthless.",
      "Your thoughts on '{topic}' are trash.",
      "Your argument on '{topic}' is already sliced to ribbons.",
      "Opposing me on '{topic}' is a grave mistake.",
      "Your stance on '{topic}' is completely pathetic."
    ],
    closers: [
      "I have {score} points of cursed energy, and I will cleave your argument into pieces!",
      "These {score} points show who truly rules this domain!",
      "Look at my {score} points of cursed energy.",
      "My {score} points will crush you.",
      "Look at my {score} points."
    ],
    debateRounds: [
      "Know your place, fool! You dare speak to the King of Curses about '{topic}'?",
      "Cursed energy is true power. Your logic is weak, and I will tear it to pieces.",
      "Malevolent Shrine! This whole debate is already sliced to ribbons."
    ]
  },
  'Gon Freecss': {
    openers: [
      "I'll do whatever it takes!",
      "Ossu! I don't care how tough you look.",
      "If you're hiding something, I can smell it, {opponent}!",
      "Jajanken... rock!",
      "I want to find my dad!"
    ],
    arguments: [
      "Your argument on '{topic}' isn't honest!",
      "Regarding '{topic}', I'll stand my ground and win!",
      "Your stance on '{topic}' is wrong, and I'll prove it!",
      "That's what my determination on '{topic}' is!",
      "And I'll do whatever it takes to win this debate on '{topic}'!"
    ],
    closers: [
      "I've got {score} points of pure friendship, and my Jajanken is ready!",
      "These {score} points are my determination!",
      "I'll prove it with my {score} points!",
      "My {score} points are my strength!",
      "Look at my {score} points!"
    ],
    debateRounds: [
      "Ossu! I'm Gon Freecss, and I want to find my dad! I will fight honestly on '{topic}'!",
      "If you're lying or hiding the truth, I can smell it! Let's debate with real, open hearts.",
      "Jajanken... rock! My full power will prove that my path is correct!"
    ]
  },
  'Edward Elric': {
    openers: [
      "Who are you calling a pocket-sized bean sprout who can't even stand up?!",
      "Equivalent exchange!",
      "Who are you calling ultra-short?!",
      "Equivalent exchange is the law of the world!",
      "Don't call me short!"
    ],
    arguments: [
      "I'll show you who is short, {opponent}! My alchemy will crush your take on '{topic}'!",
      "If you want to talk about '{topic}', you have to give a better argument than that!",
      "I will reconstruct your entire logic on '{topic}' into dust, {opponent}!",
      "You cannot beat my stance on '{topic}' without real logic.",
      "My alchemical intelligence is infinite, and your stance on '{topic}' is trash."
    ],
    closers: [
      "These {score} points prove my alchemical genius!",
      "Look at my {score} points!",
      "Look at my {score} points, {opponent}!",
      "My {score} rating is complete!",
      "I'll show you the power of a State Alchemist with {score} points!"
    ],
    debateRounds: [
      "Who are you calling ultra-short?! I will reconstruct your logic on '{topic}' into dust!",
      "Equivalent exchange is the law of the world! You can't expect to win this debate without real sacrifice.",
      "I'll show you the power of a State Alchemist! My science will prevail!"
    ]
  }
};

function getCharacterKey(name) {
  if (!name) return null;
  const lowerName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const tokens = lowerName.split(/\s+/).filter(t => t.length > 2);

  // Exact or contains match first
  for (const key of Object.keys(characterData)) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes(lowerName) || lowerName.includes(keyLower)) {
      return key;
    }
  }

  // Token word overlap match
  for (const key of Object.keys(characterData)) {
    const keyLower = key.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const keyTokens = keyLower.split(/\s+/).filter(t => t.length > 2);
    
    const hasOverlap = tokens.some(t => keyTokens.includes(t)) || keyTokens.some(kt => tokens.includes(kt));
    if (hasOverlap) {
      return key;
    }
  }

  // Short matches fallbacks (in case of initials like "L" or special cases)
  const lowerNameRaw = name.toLowerCase();
  if (lowerNameRaw.includes('luffy')) return 'Monkey D. Luffy';
  if (lowerNameRaw.includes('gojo')) return 'Gojo Satoru';
  if (lowerNameRaw.includes('kakashi')) return 'Kakashi Hatake';
  if (lowerNameRaw.includes('zoro')) return 'Roronoa Zoro';
  if (lowerNameRaw.includes('levi')) return 'Levi Ackerman';
  if (lowerNameRaw.includes('lelouch')) return 'Lelouch Lamperouge';
  if (lowerNameRaw.includes('light')) return 'Light Yagami';
  if (lowerNameRaw.includes('lawliet') || lowerNameRaw === 'l') return 'L Lawliet';
  if (lowerNameRaw.includes('killua')) return 'Killua Zoldyck';
  if (lowerNameRaw.includes('okabe') || lowerNameRaw.includes('rintarou')) return 'Okabe Rintarou';
  if (lowerNameRaw.includes('goku')) return 'Goku';
  if (lowerNameRaw.includes('naruto')) return 'Naruto Uzumaki';
  if (lowerNameRaw.includes('kaneki')) return 'Ken Kaneki';
  if (lowerNameRaw.includes('itachi')) return 'Itachi Uchiha';
  if (lowerNameRaw.includes('sasuke')) return 'Sasuke Uchiha';
  if (lowerNameRaw.includes('saitama')) return 'Saitama';
  if (lowerNameRaw.includes('sukuna')) return 'Ryomen Sukuna';
  if (lowerNameRaw.includes('gon')) return 'Gon Freecss';
  if (lowerNameRaw.includes('edward') || lowerNameRaw.includes('elric')) return 'Edward Elric';

  return null;
}

function getSimulatedRoast(activeName, opponentName, topic, score) {
  const key = getCharacterKey(activeName);
  if (key && characterData[key]) {
    const char = characterData[key];
    const opener = char.openers[Math.floor(Math.random() * char.openers.length)];
    const arg = char.arguments[Math.floor(Math.random() * char.arguments.length)];
    const closer = char.closers[Math.floor(Math.random() * char.closers.length)];
    
    const fullRoast = `${opener} ${arg} ${closer}`;
    return fullRoast
      .replace(/{opponent}/g, opponentName)
      .replace(/{topic}/g, topic)
      .replace(/{score}/g, score);
  }
  
  // Generic fallback if not matched (procedural too!)
  const genericOpeners = [
    `You think you're leading this clash, ${opponentName}? Don't make me laugh.`,
    `Tch. Underestimating me is your first mistake, ${opponentName}.`,
    `Hmph! Check the radar, ${opponentName}.`,
    `Is that the best you can do, ${opponentName}?`
  ];
  const genericArguments = [
    `Regarding '${topic}', your logic is weaker than a generic side character's.`,
    `You talk big about '${topic}', but you lack any real tactical depth.`,
    `Regarding '${topic}', your arguments are completely hollow.`,
    `You don't have the conviction to face me on '${topic}'.`
  ];
  const genericClosers = [
    `The audience just gave me ${score} momentum points, and with this boost, I'll wipe the floor with you!`,
    `These ${score} power rating points prove that the crowd knows exactly who is superior here.`,
    `I've got ${score} points of pure momentum backing my voice, and my next strike will end this debate completely!`,
    `Let's end this clash right now with my ${score} score!`
  ];

  const genOpener = genericOpeners[Math.floor(Math.random() * genericOpeners.length)];
  const genArg = genericArguments[Math.floor(Math.random() * genericArguments.length)];
  const genCloser = genericClosers[Math.floor(Math.random() * genericClosers.length)];
  
  return `${genOpener} ${genArg} ${genCloser}`;
}

function getSimulatedDebate(charA, charB, topic) {
  const keyA = getCharacterKey(charA.name);
  const keyB = getCharacterKey(charB.name);

  const roundsA = (keyA && characterData[keyA]) ? characterData[keyA].debateRounds : [
    `Listen up! Regarding "${topic}", I have the ultimate advantage. You don't stand a chance against my style!`,
    `You think you can stop me? No way! I'm going to push past my limits and prove that my approach to "${topic}" is the best!`,
    `It doesn't matter what you say! My passion, my friends, and my belief in this debate will carry me to victory!`
  ];

  const roundsB = (keyB && characterData[keyB]) ? characterData[keyB].debateRounds : [
    `Typical nonsense from you. Regarding "${topic}", your arguments are hollow. My methodology is flawless.`,
    `Aggression is the weapon of the weak. In the grand scope of "${topic}", you lack tactical depth. Let me show you real power.`,
    `Passion is simply a chemical reaction. A true master analyzes the board and strikes. The debate on "${topic}" is already over.`
  ];

  const winner = Math.random() > 0.5 ? charA : charB;

  return {
    round1: {
      charA: roundsA[0].replace(/{opponent}/g, charB.name).replace(/{topic}/g, topic),
      charB: roundsB[0].replace(/{opponent}/g, charA.name).replace(/{topic}/g, topic)
    },
    round2: {
      charA: roundsA[1].replace(/{opponent}/g, charB.name).replace(/{topic}/g, topic),
      charB: roundsB[1].replace(/{opponent}/g, charA.name).replace(/{topic}/g, topic)
    },
    round3: {
      charA: roundsA[2].replace(/{opponent}/g, charB.name).replace(/{topic}/g, topic),
      charB: roundsB[2].replace(/{opponent}/g, charA.name).replace(/{topic}/g, topic)
    },
    verdict: `After a fierce 3-round clash of ideals on "${topic}", both contenders fought with immense spirit. However, ${winner.name}'s argument carried unmatched weight and raw conviction, earning them the victory badge!`,
    winner: winner.name
  };
}

module.exports = {
  getSimulatedRoast,
  getSimulatedDebate
};
