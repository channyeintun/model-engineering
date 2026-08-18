/* =========================================================================
   Lesson 11 — narration script for the walkthrough.

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

window.NARRATION['11'] = {
  title: 'Tiny speech recognition',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. By the end of this walkthrough you can take a microphone signal and turn it into text — and say what every number along the way actually means. Two bridges. Sound into a picture. Then a picture into letters, with nobody telling us where each letter begins.' },

    { id: 'a02', scene: 'asr-frontend', step: 0,
      text: 'Here is the raw audio. One number per measurement, sixteen thousand of them every second. That is it. That is the whole format. And look at that line — there is nothing in it that resembles a letter.',
      say: 'Here\'s the raw audio. One number per measurement, sixteen thousand of them every second. That\'s it. That\'s the whole format. And look at that line. There\'s nothing in it that resembles a letter.' },

    { id: 'a03', scene: 'asr-frontend', step: 1,
      text: 'Speech does not sit still. It changes every few tens of milliseconds. So we chop it into short windows — <b>25 ms</b> wide, moving only <b>10</b>. Watch the box slide. Each window overlaps the last, so nothing falls between them.',
      say: 'Speech doesn\'t sit still. It changes every few tens of milliseconds. So we chop it into short windows. Twenty five milliseconds wide, moving only ten. Watch the box slide. Each window overlaps the last, so nothing falls between them.' },

    { id: 'a04', scene: 'asr-frontend', step: 2,
      text: 'One window is <b>400 samples</b>. An <b>FFT</b> turns it into <b>201</b> numbers, one for each band of 40 Hz. So — that is the frequency content of a single moment, one hundredth of a second wide.',
      say: 'One window is four hundred samples. A fast Fourier transform turns it into two hundred and one numbers, one for each band of forty hertz. So. That\'s the frequency content of a single moment, one hundredth of a second wide.' },

    { id: 'a05', scene: 'asr-frontend', step: 3,
      text: 'But 201 is more than we need. So <b>80</b> triangular filters squash them down to 80, and a logarithm compresses the loudness. And that. That is one column of the picture.',
      say: 'But two hundred and one is more than we need. So eighty triangular filters squash them down to eighty, and a logarithm compresses the loudness. And that. That is one column of the picture.' },

    { id: 'a06', scene: 'asr-frontend', step: 4,
      text: 'Now do it for every window, and stand the columns side by side. <b>100 columns every second</b>. And sound has become a picture — time running across, frequency running up.',
      say: 'Now do it for every window, and stand the columns side by side. A hundred columns every second. And sound has become a picture. Time running across, frequency running up.' },

    { id: 'a07', scene: 'asr-frontend', step: 5,
      text: 'And here is the part that pays you back. You can read it. Strong energy low down? That is a vowel. A bright fuzzy block at the top with no stripes? A fricative, an <b>s</b>. Learn four shapes and you can debug an audio pipeline with your eyes.',
      say: 'And here\'s the part that pays you back. You can read it. Strong energy low down? That\'s a vowel. A bright fuzzy block at the top with no stripes? A fricative. An ess. Learn four shapes and you can debug an audio pipeline with your eyes.' },

    { id: 'a08', scene: 'asr-melscale', step: 0,
      text: 'But why 80 bands, and why placed where they are? Because your ear is not linear. <b>100 Hz to 200 Hz</b> is an enormous change. 4000 to 4100? You can barely hear it. Same number of hertz. Nothing like the same difference.',
      say: 'But why eighty bands, and why placed where they are? Because your ear isn\'t linear. A hundred hertz to two hundred hertz is an enormous change. Four thousand to four thousand one hundred? You can barely hear it. Same number of hertz. Nothing like the same difference.' },

    { id: 'a09', scene: 'asr-melscale', step: 2,
      text: 'So we warp the axis. This is the <b>mel</b> scale. Space the 80 filter centres evenly along it — perfectly even — then map every centre back to real frequency. Watch the lines lean. The spacing crowds up at the left and stretches wide at the right.',
      say: 'So we warp the axis. This is the mel scale. Space the eighty filter centres evenly along it. Perfectly even. Then map every centre back to real frequency. Watch the lines lean. The spacing crowds up at the left, and stretches wide at the right.' },

    { id: 'a10', scene: 'asr-melscale', step: 4,
      text: 'Each centre becomes a triangular filter. Narrow and crowded low down, wide and sparse up high. About <b>43 of the 80</b> end up below 2 kHz. And the whole bank is one fixed matrix, so applying it is a single matrix multiply.',
      say: 'Each centre becomes a triangular filter. Narrow and crowded low down, wide and sparse up high. About forty three of the eighty end up below two thousand hertz. And the whole bank is one fixed matrix, so applying it is a single matrix multiply.' },

    { id: 'a11', scene: 'asr-ctc', step: 0,
      text: 'Right. Now the hard part. Five seconds of speech is <b>500 frames</b>, and the transcript is a couple of dozen characters. So who labels which frame is which letter? Nobody. <b>CTC</b> answers with one extra symbol — the blank. And blank does not mean silence.',
      say: 'Right. Now the hard part. Five seconds of speech is five hundred frames, and the transcript is a couple of dozen characters. So who labels which frame is which letter? Nobody does. C T C, connectionist temporal classification, answers with one extra symbol. The blank. And blank doesn\'t mean silence. It means no new letter here.' },

    { id: 'a12', scene: 'asr-ctc', step: 1,
      text: '<b>Rule one.</b> Merge neighbours that carry the same symbol. So the two <b>h</b> frames at the start become one, and the pair of <b>l</b> frames become one too. That is all rule one does.',
      say: 'Rule one. Merge neighbours that carry the same symbol. So the two aitch frames at the start become one, and the pair of ell frames become one too. That\'s all rule one does.' },

    { id: 'a13', scene: 'asr-ctc', step: 2,
      text: '<b>Rule two.</b> Delete every blank. And look — ten frames have become five letters. Hello. Nobody ever told this model where the <b>e</b> begins. It worked that out on its own.',
      say: 'Rule two. Delete every blank. And look. Ten frames have become five letters. Hello. Nobody ever told this model where the letter E begins. It worked that out on its own.' },

    { id: 'a14', scene: 'asr-ctc', step: 3,
      text: 'Now watch this one blank. The one sitting between the two <b>l</b> frames. It looks like nothing at all. It is doing real work — it holds those two apart, so rule one cannot merge them.',
      say: 'Now watch this one blank. The one sitting between the two ell frames. It looks like nothing at all. It\'s doing real work. It holds those two apart, so rule one can\'t merge them.' },

    { id: 'a15', scene: 'asr-ctc', step: 4,
      text: 'Take it away, and the word loses a letter. Hello becomes <b>helo</b>. That is the whole reason the blank symbol exists. It is a separator. Not a silence detector.',
      say: 'Take it away, and the word loses a letter. Hello, with two ells, becomes helo, with one. That\'s the whole reason the blank symbol exists. It\'s a separator. Not a silence detector.' },

    { id: 'a16', scene: 'asr-align', step: 0,
      text: 'So if the model invents its own timing — which timing do we train it towards? Here is one path over eight frames, for the word "cat". It says the <b>c</b> lasted two frames, and the <b>t</b> lasted two more.',
      say: 'So if the model invents its own timing, which timing do we train it towards? Here\'s one path over eight frames, for the word cat. It says the C lasted two frames, and the T lasted two more.' },

    { id: 'a17', scene: 'asr-align', step: 3,
      text: 'Here are two more paths. The letters land in different places, and blanks pad out the rest. Three completely different stories about when each sound happened. Now collapse all three. The differences vanish. Same word, every time.' },

    { id: 'a18', scene: 'asr-align', step: 4,
      text: 'For eight frames and the word "cat" there are <b>462</b> such paths. And CTC picks none of them. It adds up the probability of all 462, and training pushes that whole sum up.',
      say: 'For eight frames and the word cat, there are four hundred and sixty two such paths. And C T C picks none of them. It adds up the probability of all four hundred and sixty two, and training pushes that whole sum up.' },

    { id: 'a19', scene: 'asr-align', step: 5,
      text: 'The loss is minus the log of that sum. A <b>forward algorithm</b> gets it with dynamic programming, so 1000 frames cost about 1000 steps, not an astronomical number. In the lesson you run it by hand on three frames. Six paths, <b>0.510</b>. Loss, <b>0.673</b>.',
      say: 'The loss is minus the log of that sum. A forward algorithm gets it with dynamic programming, so a thousand frames cost about a thousand steps, not an astronomical number. In the lesson you run it by hand on three frames. Six paths, adding to nought point five one zero. Loss, nought point six seven three.' },

    { id: 'a20', scene: 'asr-transducer', step: 0,
      text: 'Right. So CTC has a weakness. One symbol per frame, always — and no idea what it just wrote. The <b>transducer</b> fixes both, and it decodes on a grid. Frames run across. Emitted tokens run down.',
      say: 'Right. So C T C has a weakness. One symbol per frame, always. And no idea what it just wrote. The transducer fixes both, and it decodes on a grid. Frames run across. Emitted tokens run down.' },

    { id: 'a21', scene: 'asr-transducer', step: 1,
      text: 'Three networks meet on this grid. The <b>encoder</b> gives one vector per audio frame, along the top. The <b>prediction network</b> gives one per token written so far, down the side — that is a small language model. And a <b>joint network</b> mixes them at every node.' },

    { id: 'a22', scene: 'asr-transducer', step: 3,
      text: 'Two moves, and only two. Emit the blank and you step <b>right</b>, on to the next frame, writing nothing. Emit a token and you step <b>down</b> — writing one token, staying on the <b>same</b> frame. Watch. Frame two writes a c, then an a, without advancing at all.',
      say: 'Two moves, and only two. Emit the blank and you step right, on to the next frame, writing nothing. Emit a token and you step down. Writing one token, staying on the same frame. Watch. Frame two writes a C, then an A, without advancing at all.' },

    { id: 'a23', scene: 'asr-transducer', step: 4,
      text: 'Two blanks carry us across the quiet frames. A <b>t</b> comes out on frame four. One last blank finishes the audio — and the path has spelled the word.',
      say: 'Two blanks carry us across the quiet frames. A T comes out on frame four. One last blank finishes the audio. And the path has spelled the word.' },

    { id: 'a24', scene: 'asr-transducer', step: 5,
      text: 'Now take the down-moves away. What is left may only step right, one symbol per frame. That is CTC. And notice the path never goes backwards. That is <b>monotonic</b> — and it is why a transducer never waits for the end of a sentence.',
      say: 'Now take the down moves away. What\'s left may only step right, one symbol per frame. That\'s C T C. And notice the path never goes backwards. That\'s monotonic. And it\'s why a transducer never waits for the end of a sentence.' },

    { id: 'a25', scene: 'asr-stream', step: 0,
      text: 'So what does all this cost you in delay? Whisper always processes exactly <b>30 seconds</b>. Your three-second command goes in, and <b>27 seconds of zeros</b> are packed around it to fill the box.',
      say: 'So what does all this cost you in delay? Whisper always processes exactly thirty seconds. Your three second command goes in, and twenty seven seconds of zeros are packed around it to fill the box.' },

    { id: 'a26', scene: 'asr-stream', step: 1,
      text: 'Watch the meter fill. The encoder cost does not depend on how much you said. <b>1500</b> encoder states, every single time. So most of that work is spent on silence you invented yourself.',
      say: 'Watch the meter fill. The encoder cost doesn\'t depend on how much you said. Fifteen hundred encoder states, every single time. So most of that work is spent on silence you invented yourself.' },

    { id: 'a27', scene: 'asr-stream', step: 2,
      text: 'A streaming encoder does the opposite. Zoom into those same three seconds and feed it one small chunk at a time. It keeps its <b>KV cache</b> between chunks — the same trick as Lesson 04 — so each chunk pays only for its new frames.',
      say: 'A streaming encoder does the opposite. Zoom into those same three seconds and feed it one small chunk at a time. It keeps its K V cache between chunks. The same trick as Lesson four. So each chunk pays only for its new frames.' },

    { id: 'a28', scene: 'asr-stream', step: 3,
      text: 'And each chunk may peek a little way into the future. That is <b>look-ahead</b>. It buys you accuracy, and it costs exactly its own duration in delay. So your latency is the chunk, plus the look-ahead, plus the compute.' },

    { id: 'a29', scene: 'asr-stream', step: 4,
      text: 'And here is the trade in real numbers. <b>80 ms</b> chunks give <b>8.43 %</b> word error. <b>1.12 s</b> chunks give <b>6.93 %</b>. Fourteen times the delay, for 1.5 points. Same weights. One runtime flag.',
      say: 'And here\'s the trade in real numbers. Eighty millisecond chunks give eight point four three per cent word error. One point one two second chunks give six point nine three per cent. Fourteen times the delay, for one and a half points. Same weights. One runtime flag.' },

    { id: 'a30', scene: 'asr-wer', step: 0,
      text: 'Last thing. How do you measure any of this honestly? Count the words in the reference — what the person actually said. There are nine. That nine is the denominator, and it never changes.' },

    { id: 'a31', scene: 'asr-wer', step: 2,
      text: 'Line the output up against it by <b>edit distance</b>, not by position — otherwise one early slip marks everything after it wrong. And here: the word "to", before "book", never got written. That is one <b>deletion</b>.',
      say: 'Line the output up against it by edit distance, not by position. Otherwise one early slip marks everything after it wrong. And here. The word to, before book, never got written. That\'s one deletion.' },

    { id: 'a32', scene: 'asr-wer', step: 3,
      text: 'Further along, "to" came back as "two". That is one <b>substitution</b>. And "today" was never said at all. That is one <b>insertion</b>.',
      say: 'Further along, the word to came back as the number two. That\'s one substitution. And the word today was never said at all. That\'s one insertion.' },

    { id: 'a33', scene: 'asr-wer', step: 4,
      text: 'Three errors over nine reference words. <b>33.3 %</b>. And insertions are not capped by that nine, so WER can pass 100 %. One last thing: 8.4 down to 6.9 is 1.5 points <b>absolute</b>, but <b>18 % relative</b>. Relative always sounds bigger.',
      say: 'Three errors over nine reference words. Thirty three point three per cent. And insertions aren\'t capped by that nine, so word error rate can pass a hundred per cent. One last thing. Eight point four down to six point nine is one and a half points absolute, but eighteen per cent relative. Relative always sounds bigger.' },

    { id: 'a34',
      text: 'That is the whole path. Air pressure to text. Now go and build it: your own features, a keyword model at about 95 % accuracy, then a real recogniser scored twice — once raw, once normalised. Lesson 12 runs this backwards, text to waveform. Lesson 13 makes it the ears of an assistant.',
      say: 'That\'s the whole path. Air pressure to text. Now go and build it. Your own features, a keyword model at about ninety five per cent accuracy, then a real recogniser scored twice. Once raw, once normalised. Lesson twelve runs this backwards, text to waveform. Lesson thirteen makes it the ears of an assistant.' }
  ]
};
