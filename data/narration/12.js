/* =========================================================================
   Lesson 12 — narration script for the walkthrough.

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

window.NARRATION['12'] = {
  title: 'Tiny speech synthesis',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. Last lesson you turned sound into letters. Now we run that arrow backwards. By the end of this you can name every stage of a text-to-speech pipeline, say what a vocoder actually invents, and get the first sound out fast.',
      say: 'So. Last lesson you turned sound into letters. Now we run that arrow backwards. By the end you can name every stage of a text to speech pipeline, say what a vocoder invents, and get the first sound out fast.' },

    { id: 'a02', scene: 'tts-pipeline', step: 0,
      text: 'Here is the whole machine. It starts with a sentence you typed. Seventy-eight characters, and no sound anywhere. Recognition compresses. Synthesis expands. That one difference decides everything that follows.',
      say: 'Here\'s the whole machine. It starts with a sentence you typed. Seventy eight characters, and no sound anywhere. Recognition compresses. Synthesis expands. That one difference decides everything that follows.' },

    { id: 'a35', scene: 'tts-pipeline', step: 1,
      text: 'First, <b>text normalisation</b> rewrites your sentence into what a voice must say out loud. Still text, just a different string.' },

    { id: 'a03', scene: 'tts-pipeline', step: 2,
      text: 'Two text stages later — a normaliser, then <b>grapheme-to-phoneme</b> — and we are down to sixty-two sound symbols. About sixty of these cover all of English. That small alphabet is why a fifteen million parameter voice is possible at all.',
      say: 'Two text stages later — a normaliser, then grapheme to phoneme — and we\'re down to sixty two sound symbols. About sixty of these cover all of English. That small alphabet is why a fifteen million parameter voice is possible at all.' },

    { id: 'a04', scene: 'tts-pipeline', step: 3,
      text: 'Now watch the bar at the bottom. The acoustic model turns those sixty-two symbols into five hundred frames of a mel spectrogram. Forty thousand numbers, out of almost nothing.' },

    { id: 'a05', scene: 'tts-pipeline', step: 4,
      text: 'And the <b>vocoder</b> turns those frames into 128,000 samples at 24 kHz. Lesson 11 ran at 16 kHz. A voice needs more than that, so a resample between the two is a real step you have to build.',
      say: 'And the vocoder turns those frames into a hundred and twenty eight thousand samples, at twenty four kilohertz. Lesson eleven ran at sixteen. A voice needs more than that, so a resample between the two is a real step you have to build.' },

    { id: 'a06', scene: 'tts-pipeline', step: 5,
      text: 'Right. Now read that bar from the left. The three text stages produce almost nothing. Sixty-two symbols became a hundred and twenty-eight thousand samples — two thousand times bigger — and nearly all of it happens after the phonemes.',
      say: 'Now read that bar from the left. The three text stages produce almost nothing. Sixty two symbols became a hundred and twenty eight thousand samples. Two thousand times bigger. And nearly all of it happens after the phonemes.' },

    { id: 'a07', scene: 'tts-normalise', step: 0,
      text: 'And yet the bugs your users report all live on the left, in the part that produces nothing. Six written words here. Three of them are not what a voice has to say.' },

    { id: 'a08', scene: 'tts-normalise', step: 1,
      text: 'Take the first one. Here it is a title, so the voice says <b>Doctor</b>. But in "12 Oak Dr." those same three characters mean Drive. A rule decides — and the rule needs the words around it.',
      say: 'Take the first one. Here it\'s a title, so the voice says Doctor. But in twelve Oak Drive, those same three characters mean Drive. A rule decides. And the rule needs the words around it.' },

    { id: 'a09', scene: 'tts-normalise', step: 2,
      text: 'Now the price. The currency symbol is written <b>before</b> the number and spoken <b>after</b> it. Four dollars fifty cents. Nothing in the characters tells you to move it. Somebody has to write that down.' },

    { id: 'a10', scene: 'tts-normalise', step: 3,
      text: 'And this date has no single correct reading. <b>3/4/26</b> is March the fourth in America, and the third of April in Britain. Same six characters. Your locale setting is part of the model.',
      say: 'And this date has no single correct reading. Those six characters mean March the fourth in America, and the third of April in Britain. Same six characters. Your locale setting is part of the model.' },

    { id: 'a11', scene: 'tts-normalise', step: 4,
      text: 'This expanded string is the real input to everything downstream. And normalisation is regular expressions and a locale setting, not a network. So when a small voice sounds broken, print this string first.' },

    { id: 'a12', scene: 'tts-duration', step: 0,
      text: 'So. Phonemes carry no time. The word "model" is five symbols whether you say it slowly or quickly. The encoder hands us one vector each, and right now every one of them is exactly the same width.' },

    { id: 'a13', scene: 'tts-duration', step: 1,
      text: 'A small <b>duration predictor</b> says how many frames each sound gets. Its targets come from a <b>forced aligner</b>, run over the recordings before training. And the loss lives in log space, so a four-frame schwa is not drowned out by a forty-frame vowel.',
      say: 'A small duration predictor says how many frames each sound gets. Its targets come from a forced aligner, run over the recordings before training. And the loss lives in log space, so a four frame schwa is not drowned out by a forty frame vowel.' },

    { id: 'a14', scene: 'tts-duration', step: 2,
      text: 'Watch the boxes stretch. The <b>length regulator</b> just repeats each vector that many times. One call to <b>repeat_interleave</b>, and not a single learned parameter. That is the whole thing.',
      say: 'Watch the boxes stretch. The length regulator just repeats each vector that many times. One call to repeat interleave, and not a single learned parameter. That\'s the whole thing.' },

    { id: 'a15', scene: 'tts-duration', step: 3,
      text: 'Five, fourteen, six, four, twelve. Forty-one frames. At 93.75 frames a second that is 437 milliseconds of audio. The rhythm of the word <b>is</b> that list of integers. Nothing else decides it.',
      say: 'Five, fourteen, six, four, twelve. Forty one frames. At ninety three point seven five frames a second, that\'s four hundred and thirty seven milliseconds of audio. The rhythm of the word is that list of integers. Nothing else decides it.' },

    { id: 'a16', scene: 'tts-duration', step: 4,
      text: 'And here is why this family runs on a phone. The total length is known before a single frame exists, so all forty-one come out of <b>one</b> forward pass. An autoregressive decoder would need forty-one steps, one after another.',
      say: 'And here\'s why this family runs on a phone. The total length is known before a single frame exists, so all forty one come out of one forward pass. An autoregressive decoder would need forty one steps, one after another.' },

    { id: 'a17', scene: 'tts-duration', step: 5,
      text: 'Now multiply every duration by zero point eight. Same words, spoken faster, nothing retrained. Piper hands you exactly this knob as <b>length_scale</b>. And Piper is a <b>VITS</b> model, which learns its own alignment — so it needs no forced aligner at all.',
      say: 'Now multiply every duration by zero point eight. Same words, spoken faster, nothing retrained. Piper hands you exactly this knob, and calls it the length scale. Piper also learns its own alignment during training, so it needs no forced aligner.' },

    { id: 'a18', scene: 'tts-vocoder', step: 0,
      text: 'So. The last stage, and the strangest one. A mel spectrogram is just a table of <b>magnitudes</b>: how much energy each band holds in each frame. And the scale is compressed — 4000 Hz sits only about twice as far up as 1000 Hz.',
      say: 'So. The last stage, and the strangest one. A mel spectrogram is just a table of magnitudes. How much energy each band holds in each frame. And the scale is compressed. Four thousand hertz sits only about twice as far up as one thousand hertz.' },

    { id: 'a19', scene: 'tts-vocoder', step: 1,
      text: 'But the transform that made it also produced a <b>phase</b> for every bin — where each wave sits in time. Taking the magnitude threw it away. That empty panel is what is not in your file.',
      say: 'But the transform that made it also produced a phase for every bin. Where each wave sits in time. Taking the magnitude threw it away. That empty panel is what\'s not in your file.' },

    { id: 'a36', scene: 'tts-vocoder', step: 2,
      text: 'So the transform cannot run backwards. Something has to <b>invent</b> a phase consistent between overlapping frames. That is the vocoder\'s whole job.' },

    { id: 'a20', scene: 'tts-vocoder', step: 3,
      text: 'So something has to invent it. <b>Griffin-Lim</b> invents it by iteration: go to audio, come back, keep the magnitude you were given and keep the phase you just got. Thirty-two to sixty rounds. No training — and listen, it sounds metallic.',
      say: 'So something has to invent it. Griffin Lim invents it by iteration. Go to audio, come back, keep the magnitude you were given, and keep the phase you just got. Thirty two to sixty rounds. No training. And listen — it sounds metallic.' },

    { id: 'a21', scene: 'tts-vocoder', step: 4,
      text: 'A neural vocoder learns the mapping instead, trained against a <b>discriminator</b> — a second network whose only job is to say whether a clip sounds real. Why not squared error? Because two waves can sound identical and still disagree at every sample.' },

    { id: 'a22', scene: 'tts-vocoder', step: 5,
      text: 'HiFi-GAN reported 167.9 times real time on a V100, and a light variant 13.4 times on a CPU. Still the slowest stage on a phone. And do not quantize it first — those errors arrive as an audible buzz, not a slightly lower score.',
      say: 'Hi Fi Gan reported a hundred and sixty seven point nine times real time on a V one hundred, and a light variant thirteen point four times on a processor. Still the slowest stage on a phone. And don\'t quantize it first. Those errors arrive as an audible buzz, not a slightly lower score.' },

    { id: 'a37', scene: 'tts-stream', step: 0,
      text: 'Now the number everybody quotes. One model, one machine. Its <b>real-time factor</b> is 0.2: compute time divided by audio length. Five times faster than real time.',
      say: 'Now the number everybody quotes. One model, one machine. Its real time factor is zero point two. Compute time divided by audio length. Five times faster than real time.' },

    { id: 'a23', scene: 'tts-stream', step: 1,
      text: 'Give it a twenty-second paragraph in one call, and it works for 4000 milliseconds before the last frame exists.',
      say: 'Give it a twenty second paragraph in one call, and it works for four thousand milliseconds before the last frame exists.' },

    { id: 'a24', scene: 'tts-stream', step: 2,
      text: 'Only then can playback start. Four seconds of silence, and the person heard nothing at all. Notice what just happened. The real-time factor was excellent the whole time — it is simply not the number a user feels.',
      say: 'Only then can playback start. Four seconds of silence, and the person heard nothing. Notice what just happened. The real time factor was excellent the whole time. It\'s simply not the number a user feels.' },

    { id: 'a25', scene: 'tts-stream', step: 3,
      text: 'So split the text at sentence boundaries and synthesise only the first phrase. One second of audio, two hundred milliseconds of work. Look where the marker has moved.' },

    { id: 'a26', scene: 'tts-stream', step: 4,
      text: 'Play it at once, and build phrase two while phrase one is still in the ears. Time to first audio drops from 4000 milliseconds to 200. Same model. Same real-time factor. Only the order of the work changed.',
      say: 'Play it at once, and build phrase two while phrase one is still in the ears. Time to first audio drops from four thousand milliseconds to two hundred. Same model. Same real time factor. Only the order of the work changed.' },

    { id: 'a27', scene: 'tts-stream', step: 5,
      text: 'Two things break here. Pitch resets at every boundary, so long text can sound like glued clips. And if the instantaneous factor ever crosses 1.0, the buffer empties and the audio stutters. Keep 200 to 400 milliseconds in reserve.',
      say: 'Two things break here. Pitch resets at every boundary, so long text sounds like glued clips. And if the instantaneous factor ever crosses one point zero, the buffer empties and the audio stutters. Keep two hundred to four hundred milliseconds in reserve.' },

    { id: 'a28', scene: 'tts-size', step: 0,
      text: 'Last question. What actually fits? File size, on a logarithmic axis — each step right is ten times bigger. The 4 GB model out there predicts audio as <b>tokens</b>, and a token voice needs about 84 a second. NeuTTS Air managed 20 on a Galaxy A25.',
      say: 'So, what actually fits? File size, on a logarithmic axis. Each step to the right is ten times bigger. The four gigabyte model out there predicts audio as tokens, and a token voice needs about eighty four a second. New T T S Air managed twenty, on a Galaxy A twenty five.' },

    { id: 'a29', scene: 'tts-size', step: 1,
      text: 'Below 30 MB the speech is correct and clearly synthetic. Flat rhythm, the occasional wrong word. Fine for navigation prompts. Not fine for an audiobook.',
      say: 'Below thirty megabytes the speech is correct and clearly synthetic. Flat rhythm, the occasional wrong word. Fine for navigation prompts. Not fine for an audiobook.' },

    { id: 'a30', scene: 'tts-size', step: 2,
      text: 'Between 50 and 100 MB is the 2026 sweet spot. Piper is the fast, boring, safe choice — but it is GPL-3.0, so check that before you ship. Kokoro sounds more natural: 54 voices, 8 languages, and no cloning at all.',
      say: 'Between fifty and a hundred megabytes is the twenty twenty six sweet spot. Piper is the fast, boring, safe choice. But it\'s licensed under G P L three, so check that before you ship. Kokoro sounds more natural. Fifty four voices, eight languages, and no cloning.' },

    { id: 'a31', scene: 'tts-size', step: 3,
      text: 'If 100 MB is not enough, the next band is 250 to 350 MB. Near-commercial quality on short sentences. Supertonic 3 reports a real-time factor of 0.3 — on a Raspberry Pi.',
      say: 'If a hundred megabytes isn\'t enough, the next band is two hundred and fifty to three hundred and fifty megabytes. Near commercial quality on short sentences. Supertonic three reports a real time factor of zero point three. On a Raspberry Pi.' },

    { id: 'a32', scene: 'tts-size', step: 4,
      text: 'Above half a gigabyte you buy voice cloning and expressive rhythm, and you pay for both in latency. But stop here. Three seconds of someone speaking is enough to copy them — so decide your consent rules before you write a line of code.' },

    { id: 'a33', scene: 'tts-size', step: 5,
      text: 'The dashed line is the budget for your project. Everything to the left of it fits. But size on disk does not predict latency: one benchmark measured Piper at a 61 MB file and 2.6 GB of peak memory.',
      say: 'The dashed line is the budget for your project. Everything left of it fits. But size on disk does not predict latency. One benchmark measured Piper at a sixty one megabyte file, and two point six gigabytes of peak memory.' },

    { id: 'a34',
      text: 'So go and build one. A front end you wrote, a model you chose on purpose, a streaming loop — all inside 100 MB — and measure your own time to first audio. Then in Lesson 13 listening and speaking finally run at the same time, under one and a half seconds from question to answer.',
      say: 'So go and build one. A front end you wrote, a model you chose on purpose, a streaming loop. All inside a hundred megabytes. And measure your own time to first audio. Then in Lesson thirteen, listening and speaking finally run at the same time, under one and a half seconds from question to answer.' }
  ]
};
