/* =========================================================================
   Lesson 13 — narration script for the walkthrough.

   Each segment:
     id     stable, short. The audio timings are keyed on it, so do not
            renumber existing ids when you insert a new segment.
     text   the caption. Light <b> emphasis is fine.
     say    optional. What the voice actually reads, when the caption
            contains something a speech model would mangle — symbols,
            code, abbreviations. If absent, the caption is read with its
            tags stripped.
     scene  which figure to bring on stage, and
     step   which of its steps to play. Omit both for a title card.

   Write for the ear, the way a person teaches: contractions, discourse
   markers, fragments for emphasis, a long sentence then a very short one.
   No symbols the voice cannot say.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['13'] = {
  title: 'Full-duplex conversation',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. Last lesson. By the end of this walkthrough you will have a voice assistant that runs with the network switched off — and, just as important, an honest account of what it cannot do. It starts with one measurement about people.',
      say: 'So. Last lesson. By the end of this walkthrough you\'ll have a voice assistant that runs with the network switched off. And, just as important, an honest account of what it can\'t do. It starts with one measurement about people.' },

    { id: 'a02', scene: 'fd-paradox', step: 0,
      text: 'Two people, one conversation. Time runs to the right, and that bar along the bottom is one second. Speaker A is asking a question. Watch the gap that comes next.' },

    { id: 'a03', scene: 'fd-paradox', step: 1,
      text: 'Speaker B answers. And here is the number: the gap between them peaks at about <b>200 ms</b>. Between 51% and 55% of all transitions are shorter than that. Ten languages, the same peak — so this is not an English habit.',
      say: 'Speaker B answers. And here\'s the number. The gap between them peaks at about two hundred milliseconds. Between fifty one and fifty five per cent of all transitions are shorter than that. Ten languages, the same peak. So this is not an English habit.' },

    { id: 'a04', scene: 'fd-paradox', step: 2,
      text: 'Now the awkward fact. Naming <b>one word</b> takes a person about 600 ms. Two words, seven hundred and forty. A whole sentence, around 1500 ms. So ask yourself — where does all that planning fit?',
      say: 'Now the awkward fact. Naming one word takes a person about six hundred milliseconds. Two words, seven hundred and forty. A whole sentence, around fifteen hundred milliseconds. So ask yourself. Where does all that planning fit?' },

    { id: 'a05', scene: 'fd-paradox', step: 3,
      text: 'Only backwards. It has to. Four hundred milliseconds of that plan happened while Speaker A was <b>still talking</b>. People do not detect the end of a turn. They predict it, and they start work early.',
      say: 'Only backwards. It has to. Four hundred milliseconds of that plan happened while Speaker A was still talking. People don\'t detect the end of a turn. They predict it, and they start work early.' },

    { id: 'a06', scene: 'fd-paradox', step: 4,
      text: 'A machine that waits for silence starts here instead. The same six hundred milliseconds of work, begun four hundred milliseconds later, so it answers four hundred milliseconds late. It can be made fast. It can never be on time.' },

    { id: 'a07',
      text: 'Right. Everything from here is checked against one real program you can install tonight — <b>huggingface/speech-to-speech</b>. But read its defaults, not its tagline. Its shipped language backend is a network call, so follow the quickstart and you are timing somebody else\'s data centre.',
      say: 'Right. Everything from here is checked against one real program you can install tonight. Hugging face speech to speech. But read its defaults, not its tagline. Its shipped language backend is a network call. So follow the quickstart, and you\'re timing somebody else\'s data centre.' },

    { id: 'a08', scene: 'fd-cascade', step: 0,
      text: 'So. Audio arrives at sixteen thousand samples a second whether you are ready or not. A function call returns when it has finished — audio does not wait for that. So every stage becomes a thread, and between two threads sits a queue.',
      say: 'So. Audio arrives at sixteen thousand samples a second whether you\'re ready or not. A function call returns when it has finished. Audio doesn\'t wait for that. So every stage becomes a thread, and between two threads sits a queue.' },

    { id: 'a09', scene: 'fd-cascade', step: 2,
      text: 'Now count the boxes. Six, not four. And here is the first one nobody predicts: a <b>notifier</b>, whose whole job is telling the client what is happening before a single word has been transcribed.',
      say: 'Now count the boxes. Six, not four. And here\'s the first one nobody predicts. A notifier, whose whole job is telling the client what\'s happening before a single word has been transcribed.' },

    { id: 'a10', scene: 'fd-cascade', step: 4,
      text: 'And the second. An <b>output processor</b> puts text, tool calls and speech inputs on one queue, so a later piece cannot overtake an earlier one. Skip it, and your user hears the sentence in the wrong order.',
      say: 'And the second. An output processor puts text, tool calls and speech inputs on one queue, so a later piece can\'t overtake an earlier one. Skip it, and your user hears the sentence in the wrong order.' },

    { id: 'a11', scene: 'fd-cascade', step: 5,
      text: 'One dashed path is left. Protocol events bypass the audio path entirely — that is how the client is told you started speaking before recognition has produced anything at all. Six threads. Eight queues. One side channel.',
      say: 'One dashed path is left. Protocol events bypass the audio path entirely. That\'s how the client is told you started speaking before recognition has produced anything at all. Six threads. Eight queues. One side channel.' },

    { id: 'a12', scene: 'fd-bargein', step: 0,
      text: 'Now, interruption. The model is halfway through an answer, and its audio is leaving the speaker right now. So what happens when you talk over it?' },

    { id: 'a13', scene: 'fd-bargein', step: 2,
      text: 'Fifty milliseconds later the system decides to stop. But stopping generation is not stopping <b>sound</b>. With a four hundred millisecond playback buffer, your user still hears four hundred and fifty milliseconds of an answer you already cancelled.' },

    { id: 'a14', scene: 'fd-bargein', step: 4,
      text: 'So look inside the graph. Every item of work carries the generation it belongs to — right now, seven. Interrupt, and that counter simply goes to eight. Everything stamped seven is stale, and each thread drops it wherever it happens to be sitting.' },

    { id: 'a15', scene: 'fd-bargein', step: 5,
      text: 'And that is the whole cancellation mechanism. <b>One integer.</b> No timers, no races, no half-cancelled state. Then flush the buffer, and truncate the history to what your user actually <b>heard</b> — not to what the model generated.',
      say: 'And that\'s the whole cancellation mechanism. One integer. No timers, no races, no half cancelled state. Then flush the buffer, and truncate the history to what your user actually heard. Not to what the model generated.' },

    { id: 'a16', scene: 'fd-waterfall', step: 0,
      text: 'So where does the time actually go? Here is an honest phone budget. The clock starts at your <b>last audio sample</b>. Two lines first: the architectural floor for this design, and the target this course asks you to hit.',
      say: 'So where does the time actually go? Here\'s an honest phone budget. The clock starts at your last audio sample. Two lines first. The architectural floor for this design, and the target this course asks you to hit.' },

    { id: 'a17', scene: 'fd-waterfall', step: 1,
      text: 'And look what the first three rows are. Not computation. <b>Policy.</b> Framing, then sixty-four milliseconds to be sure the silence is real, then a small classifier asking whether you actually finished.' },

    { id: 'a18', scene: 'fd-waterfall', step: 2,
      text: 'Only now does anything expensive happen. The recogniser finalises its transcript in a hundred and fifty milliseconds, and the language model takes three hundred more to produce its very first token.' },

    { id: 'a19', scene: 'fd-waterfall', step: 4,
      text: 'Then decode to a whole clause, four hundred. First audio chunk out, two hundred. Playback buffer, sixty. Total: <b>1246 ms</b>. Past the floor, inside the target. And notice — not one of those rows is the model being slow.',
      say: 'Then decode to a whole clause, four hundred. First audio chunk out, two hundred. Playback buffer, sixty. Total: one thousand two hundred and forty six milliseconds. Past the floor, inside the target. And notice. Not one of those rows is the model being slow.' },

    { id: 'a20', scene: 'fd-waterfall', step: 5,
      text: 'And the eight hundred millisecond commit hold? It starts when silence is detected and runs <b>alongside</b> everything else, finishing at 896. On this phone it is free. On a server whose pipeline finishes in three hundred milliseconds, that same hold is the entire latency.',
      say: 'And the eight hundred millisecond commit hold? It starts when silence is detected and runs alongside everything else, finishing at eight hundred and ninety six. On this phone it\'s free. On a server whose pipeline finishes in three hundred milliseconds, that same hold is the entire latency.' },

    { id: 'a21', scene: 'fd-endpoint', step: 0,
      text: 'Now the hardest decision in the whole system. Somebody is reading out a phone number, and they stop in the middle to remember the rest. A pause of five hundred and fifty milliseconds. Is that turn finished? A silence timer cannot tell you.',
      say: 'Now the hardest decision in the whole system. Somebody is reading out a phone number, and they stop in the middle to remember the rest. A pause of five hundred and fifty milliseconds. Is that turn finished? A silence timer can\'t tell you.' },

    { id: 'a22', scene: 'fd-endpoint', step: 2,
      text: 'The detector knows nothing about words. It sees quiet, waits sixty-four milliseconds, closes the segment. Then <b>Smart Turn</b> — a Whisper-Tiny encoder, 8.7 MB — reads the waveform and says: not finished. So the system deliberately stalls six hundred milliseconds before spending any compute.',
      say: 'The detector knows nothing about words. It sees quiet, waits sixty four milliseconds, closes the segment. Then Smart Turn, a whisper tiny encoder, eight point seven megabytes, reads the waveform and says: not finished. So the system deliberately stalls six hundred milliseconds before spending any compute.' },

    { id: 'a23', scene: 'fd-endpoint', step: 3,
      text: 'And speech resumes inside that window. So the turn <b>reopens as a newer revision</b>. The work already in flight is thrown away before anyone hears it, and the whole accumulated audio is re-emitted as one turn.' },

    { id: 'a24', scene: 'fd-endpoint', step: 5,
      text: 'Here is why that matters. The classifier is right 92.63% of the time — one turn in thirteen wrong. On Vietnamese, 79.38%. One in five. So the reopen window is not defensive coding. It is load-bearing.',
      say: 'Here\'s why that matters. The classifier is right ninety two point six three per cent of the time. One turn in thirteen wrong. On Vietnamese, seventy nine point three eight per cent. One in five. So the reopen window isn\'t defensive coding. It\'s load bearing.' },

    { id: 'a25', scene: 'fd-rtf', step: 0,
      text: 'Now — benchmarks, and how not to be lied to by one. Seven speech synthesis builds, ranked by the number you can read straight off a download page. File size, smallest at the top.' },

    { id: 'a26', scene: 'fd-rtf', step: 2,
      text: 'And here they are again, ranked by <b>real-time factor</b> — compute time divided by audio duration, one CPU thread, lower is better. Now join them up. The order does not survive. Not even close.',
      say: 'And here they are again, ranked by real time factor. Compute time divided by audio duration, one processor thread, lower is better. Now join them up. The order does not survive. Not even close.' },

    { id: 'a27', scene: 'fd-rtf', step: 4,
      text: 'Draw the line at exactly real time and both Kokoro rows fall through it. Kokoro is the <b>largest</b> model in the table, 82 million parameters. And its int8 build is 2.6 times smaller on disk and 1.75 times <b>slower</b>. Quantization buys bytes. Milliseconds only when the kernels exist.',
      say: 'Draw the line at exactly real time, and both Kokoro rows fall through it. Kokoro is the largest model in the table. Eighty two million parameters. And its eight bit build is two point six times smaller on disk, and one point seven five times slower. Quantization buys bytes. Milliseconds only when the kernels exist.' },

    { id: 'a28', scene: 'fd-layers', step: 0,
      text: 'Right. One question sorts every voice agent you will ever meet. <b>Where does the duplex decision live?</b> There are four possible answers. And only three of them exist.',
      say: 'Right. One question sorts every voice agent you\'ll ever meet. Where does the duplex decision live? There are four possible answers. And only three of them exist.' },

    { id: 'a29', scene: 'fd-layers', step: 3,
      text: 'Inside the token sequence there is no scheduler at all — taking a turn is just another thing the model predicts. That is Moshi, at 12.5 frames a second. But it never idles. On a phone, that difference is thermal, not arithmetic.',
      say: 'Inside the token sequence there\'s no scheduler at all. Taking a turn is just another thing the model predicts. That\'s Moshi, at twelve point five frames a second. But it never idles. On a phone, that difference is thermal, not arithmetic.' },

    { id: 'a30', scene: 'fd-layers', step: 5,
      text: 'Yours is the first column — the decision outside the model. And it has a floor: roughly five hundred milliseconds, and even that assumes a server-class forward pass. A phone lands at 0.9 to 2.0 s. So do not chase the milliseconds. Chase the manners.',
      say: 'Yours is the first column. The decision outside the model. And it has a floor. Roughly five hundred milliseconds, and even that assumes a server class forward pass. A phone lands at nought point nine to two seconds. So don\'t chase the milliseconds. Chase the manners.' },

    { id: 'a31', scene: 'fd-offline', step: 0,
      text: 'Which brings us to the capstone. Everything from Part Five, inside one box. Audio in on the left, audio out on the right, and nothing in between touches a network.' },

    { id: 'a32', scene: 'fd-offline', step: 2,
      text: 'The recogniser streams partial text while you speak. And the brain? It is the checkpoint you fine-tuned in Lesson 05, quantized in Lesson 07, exported in Lesson 09. You are not training anything today. You are connecting things.',
      say: 'The recogniser streams partial text while you speak. And the brain? It\'s the checkpoint you fine tuned in Lesson five, quantized in Lesson seven, exported in Lesson nine. You\'re not training anything today. You\'re connecting things.' },

    { id: 'a33', scene: 'fd-offline', step: 4,
      text: 'And the arrow to the server is gone. 345 MB on disk, about 2 GB resident, median voice-to-voice under 1.5 s. It answers about a second later than the cloud — and it never talks over you. That is the trade. Say it out loud.',
      say: 'And the arrow to the server is gone. Three hundred and forty five megabytes on disk, about two gigabytes resident, median voice to voice under one and a half seconds. It answers about a second later than the cloud. And it never talks over you. That\'s the trade. Say it out loud.' },

    { id: 'a34',
      text: 'So go and build it. Six steps, then one honest measurement: median and ninetieth percentile, from your last speech sample to the first sample your speaker plays. There is no Lesson Fourteen. The next thing is <b>evaluation</b> — go and find the first conversation your assistant cannot handle.',
      say: 'So go and build it. Six steps, then one honest measurement. Median and ninetieth percentile, from your last speech sample to the first sample your speaker plays. There is no Lesson Fourteen. The next thing is evaluation. Go and find the first conversation your assistant can\'t handle.' }
  ]
};
