/* =========================================================================
   Lesson 01 — narration script for the walkthrough.

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

window.NARRATION['01'] = {
  title: 'Tensors and the training loop',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. By the end of this walkthrough you can explain how any model learns — a digit classifier, a language model, a speech recogniser. Three moving parts. A pile of numbers, one number that says how wrong they are, and a small step downhill.' },

    { id: 'a02', scene: 'gd', step: 0,
      text: 'Let us start as small as we possibly can. One number. Just one — we will call it a weight. For every value that weight could take, the model makes some error. Plot the error, and we get this curve.',
      say: 'Let\'s start as small as we possibly can. One number. Just one. We\'ll call it a weight. For every value that weight could take, the model makes some error. Plot the error, and we get this curve.' },

    { id: 'a03', scene: 'gd', step: 1,
      text: 'But here is the problem. We can never actually see this curve. A real model has millions of these numbers, and we only ever get to stand at one point — right here, where the loss is high and nothing tells us which way is down.',
      say: 'But here\'s the problem. We can never actually see this curve. A real model has millions of these numbers, and we only ever get to stand at one point. Right here, where the loss is high and nothing tells us which way is down.' },

    { id: 'a04', scene: 'gd', step: 2,
      text: 'So we ask the one question we can afford. How steep is the ground, right here? That is the <b>gradient</b>. Nudge this weight up a little — does the loss go up or down, and how fast?',
      say: 'So we ask the one question we can afford. How steep is the ground, right here? That\'s the gradient. Nudge this weight up a little. Does the loss go up or down, and how fast?' },

    { id: 'a05', scene: 'gd', step: 3,
      text: 'Then we step the opposite way. Not all the way down. Just a small fraction of that slope — and that fraction is the <b>learning rate</b>. It is the most important number you will ever choose by hand.',
      say: 'Then we step the opposite way. Not all the way down. Just a small fraction of that slope. And that fraction is the learning rate. It\'s the most important number you\'ll ever choose by hand.' },

    { id: 'a06', scene: 'gd', step: 4,
      text: 'Now repeat, and notice what happens without anyone asking. The curve flattens, so the slope shrinks, so the step shrinks too. The model slows down as it arrives. Nobody programmed that. It is a consequence of the rule itself.' },

    { id: 'a07', scene: 'gd', step: 5,
      text: 'Right. Now make the learning rate too large. Every step jumps clean over the valley, and the loss climbs instead of falling. A few more steps and it becomes <b>nan</b> — not a number — and that poisons every parameter it touches.',
      say: 'Right. Now make the learning rate too large. Every step jumps clean over the valley, and the loss climbs instead of falling. A few more steps and the loss becomes not a number. And that poisons every parameter it touches.' },

    { id: 'a08', scene: 'shapes', step: 0,
      text: 'So much for the rule. Now the data. Everything you pass around is a <b>tensor</b> — an array of numbers with a shape. Here is a batch of thirty-two grey images. Four numbers: batch, channels, height, width.',
      say: 'So much for the rule. Now the data. Everything you pass around is a tensor. An array of numbers with a shape. Here\'s a batch of thirty two grey images. Four numbers: batch, channels, height, width.' },

    { id: 'a09', scene: 'shapes', step: 1,
      text: 'Channels is the one that trips people up. It is one full grid of numbers per image. Grey needs one. Colour needs three. Now flatten each image into one long row: 1 × 28 × 28 = 784 numbers.',
      say: 'Channels is the one that trips people up. It\'s one full grid of numbers per image. Grey needs one. Colour needs three. Now flatten each image into one long row. One times twenty eight times twenty eight. Seven hundred and eighty four numbers.' },

    { id: 'a10', scene: 'shapes', step: 2,
      text: 'A linear layer takes those 784 numbers down to 128. Then a second one takes 128 down to 10 — one score per digit. One thing this picture leaves out: between the two you need a bend, a <b>ReLU</b>, or they collapse into a single layer.',
      say: 'A linear layer takes those seven hundred and eighty four numbers down to one hundred and twenty eight. Then a second one takes them down to ten. One score per digit. One thing this picture leaves out. Between the two you need a bend, a rectified linear unit, or they collapse into a single layer.' },

    { id: 'a11', scene: 'shapes', step: 3,
      text: 'Now look at the first number in every shape. It never changed. Those thirty-two examples travelled side by side and never mixed — that is all a batch is. It is there for speed.',
      say: 'Now look at the first number in every shape. It never changed. Those thirty two examples travelled side by side and never mixed. That\'s all a batch is. It\'s there for speed.' },

    { id: 'a12', scene: 'autograd', step: 0,
      text: 'So where do gradients actually come from? Here is the smallest real example. One weight, <b>w = 3</b>. One input, <b>x = 2</b>. Multiply, and the model says six. The target was ten, so the error is minus four, and squaring it gives a loss of sixteen.',
      say: 'So where do gradients actually come from? Here\'s the smallest real example. One weight, called w, set to three. One input, called x, set to two. Multiply, and the model says six. The target was ten. So the error is minus four, and squaring it gives a loss of sixteen.' },

    { id: 'a13', scene: 'autograd', step: 1,
      text: 'You write that as ordinary Python. Nothing special. But while it runs, PyTorch is quietly writing down every operation you performed, in order — a tape of the whole forward pass.' },

    { id: 'a14', scene: 'autograd', step: 2,
      text: 'Then you call <b>loss.backward()</b>, and it walks that tape backwards, right to left. Data went forward. Gradients come back.',
      say: 'Then you call backward on the loss, and it walks that tape backwards, right to left. Data went forward. Gradients come back.' },

    { id: 'a15', scene: 'autograd', step: 3,
      text: 'And at each stop it multiplies by one small local derivative. Squaring minus four gives minus eight. Subtracting ten changes nothing, so still minus eight. Multiplying by an input of two gives minus sixteen. That is the chain rule. All of it.' },

    { id: 'a16', scene: 'autograd', step: 4,
      text: 'So the answer is minus sixteen. And read what the sign is telling you: raising this weight would <b>lower</b> the loss. The update rule subtracts the gradient — so the weight goes up. That is where the minus sign comes from.',
      say: 'So the answer is minus sixteen. And read what the sign is telling you. Raising this weight would lower the loss. The update rule subtracts the gradient, so the weight goes up. That\'s where the minus sign comes from.' },

    { id: 'a17',
      text: 'Now turn the handle once. With <b>lr = 0.1</b>, the weight moves from 3.00 to 4.60. The output goes from 6.00 to 9.20. And the loss? 16.00, down to 0.64. One step. That is training.',
      say: 'Now turn the handle once. With a learning rate of nought point one, the weight moves from three to four point six. The output goes from six to nine point two. And the loss? Sixteen, down to nought point six four. One step. That is training.' },

    { id: 'a18', scene: 'ce', step: 1,
      text: 'So what number are we minimising? For anything that picks a category, the model gives one raw score per class. They can be negative, and they add up to nothing in particular. <b>Softmax</b> fixes that: now they are probabilities, and they add to one.',
      say: 'So what number are we minimising? For anything that picks a category, the model gives one raw score per class. They can be negative, and they add up to nothing in particular. Softmax fixes that. Now they\'re probabilities, and they add to one.' },

    { id: 'a19', scene: 'ce', step: 3,
      text: 'And this is the part that matters. Only one of these bars is ever graded — the one for the correct class. The loss is minus the natural logarithm of that probability. So as the bar grows, the loss falls toward zero.' },

    { id: 'a20', scene: 'ce', step: 4,
      text: 'Now watch the asymmetry. That one bar climbed to 0.86, and the loss fell to 0.15. But suppose the model had been confidently wrong instead — 0.01 on the right answer. Then the loss is 4.6. Confident mistakes hurt most.',
      say: 'Now watch the asymmetry. That one bar climbed to nought point eight six, and the loss fell to nought point one five. But suppose the model had been confidently wrong instead. Nought point nought one on the right answer. Then the loss is four point six. Confident mistakes hurt most.' },

    { id: 'a21', scene: 'optim', step: 1,
      text: 'Careful here — the picture just changed. Two parameters now, so the loss is a landscape seen from above, like a hiking map. Each ring joins points of equal loss. And plain <b>SGD</b> follows the steepest slope, which points across this valley. So it crosses. Again and again.',
      say: 'Careful here. The picture just changed. Two parameters now, so the loss is a landscape seen from above, like a hiking map. Each ring joins points of equal loss. And plain S G D follows the steepest slope, which points across this valley. So it crosses. Again and again.' },

    { id: 'a22', scene: 'optim', step: 2,
      text: '<b>Momentum</b> fixes that. It keeps a running average of recent gradients, so the side-to-side parts cancel out and the forward part adds up. Like a heavy ball that does not react to every bump.',
      say: 'Momentum fixes that. It keeps a running average of recent gradients, so the side to side parts cancel out and the forward part adds up. Like a heavy ball that doesn\'t react to every bump.' },

    { id: 'a23', scene: 'optim', step: 3,
      text: '<b>Adam</b> adds a second idea. It tracks how big each parameter\'s recent gradients have been, and divides the step by that — which is why it works with almost no tuning. But it stores two extra numbers per parameter. On a billion-parameter model, that alone is 8 GB. Use <b>AdamW</b>.',
      say: 'Adam adds a second idea. It tracks how big each parameter\'s recent gradients have been, and divides the step by that. Which is why it works with almost no tuning. But it stores two extra numbers per parameter. On a billion parameter model, that alone is eight gigabytes. Use Adam W.' },

    { id: 'a24', scene: 'loop', step: 1,
      text: 'Right. The loop itself — five lines, and you will write them hundreds of times. Line one: <b>zero_grad()</b>. Throw away last batch\'s gradients. PyTorch adds to the gradient instead of replacing it, so this line is not optional.',
      say: 'Right. The loop itself. Five lines, and you\'ll write them hundreds of times. Line one. Zero grad. Throw away last batch\'s gradients. PyTorch adds to the gradient instead of replacing it, so this line is not optional.' },

    { id: 'a25', scene: 'loop', step: 3,
      text: 'Two: forward. Data flows through the model, and the tape gets recorded. Three: the loss. It compares the output with the target and hands back one single number — how wrong we are, right now.' },

    { id: 'a26', scene: 'loop', step: 4,
      text: 'Four: backward. The tape is replayed in reverse, and every single parameter gets its own gradient written down beside it.' },

    { id: 'a27', scene: 'loop', step: 5,
      text: 'Five: step. The optimizer moves every parameter a little way downhill. Then straight back to line one, for the next batch. That is it. That is the whole loop.' },

    { id: 'a28', scene: 'loop', step: 6,
      text: 'Now delete line one, and watch. Nothing crashes. The gradients just pile up — batch three trained on the sum of one, two and three — so your real learning rate grows without limit. Training does not break. It quietly gets worse.',
      say: 'Now delete line one, and watch. Nothing crashes. The gradients just pile up. Batch three trained on the sum of one, two and three. So your real learning rate grows without limit. Training doesn\'t break. It quietly gets worse.' },

    { id: 'a29', scene: 'loop', step: 7,
      text: 'But the same behaviour is a gift, when you ask for it. Run four small batches, go backward on each, then step once. You get the gradient of a batch four times bigger than your memory allows. That is gradient accumulation.' },

    { id: 'a30', scene: 'fit', step: 0,
      text: 'One last skill, and it will save you days. Training loss falls, and keeps falling. On its own? That tells you almost nothing. It only means the model is memorising what it has already seen.',
      say: 'One last skill, and it\'ll save you days. Training loss falls, and keeps falling. On its own? That tells you almost nothing. It only means the model is memorising what it has already seen.' },

    { id: 'a31', scene: 'fit', step: 1,
      text: 'So you hold back data the model never trains on. Your validation split. At first it improves too — good. The model is learning something real, not just the training set.' },

    { id: 'a32', scene: 'fit', step: 2,
      text: 'And then it turns upward. From this moment on, the model is memorising instead of learning, and that growing gap is what <b>overfitting</b> looks like on a chart.',
      say: 'And then it turns upward. From this moment on, the model is memorising instead of learning, and that growing gap is what overfitting looks like on a chart.' },

    { id: 'a33', scene: 'fit', step: 3,
      text: 'So the model you want is the one from just before the turn. Keep that checkpoint, throw the later ones away. That is early stopping, and it is the cheapest fix in machine learning.' },

    { id: 'a34',
      text: 'That is the whole mechanism. Now go and use it: train a small network on MNIST, past 97% on the held-out split — then break it on purpose and watch each failure. Lesson 02 opens the linear layer itself, and builds a network with no ready-made layers at all.',
      say: 'That\'s the whole mechanism. Now go and use it. Train a small network on M NIST, past ninety seven per cent on the held out split. Then break it on purpose, and watch each failure. Lesson two opens the linear layer itself, and builds a network with no ready made layers at all.' }
  ]
};
