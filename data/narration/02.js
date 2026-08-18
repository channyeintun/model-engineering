/* =========================================================================
   Lesson 02 — narration script for the walkthrough.

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

   Written to be spoken, not read: contractions, fragments for emphasis,
   a question then its answer, and full stops where the voice should breathe.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['02'] = {
  title: 'Networks from scratch',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'Lesson One left you with one honest gap. You called <b>backward</b>, the gradients appeared, and nobody told you how. Today we open it — with a calculator, on numbers small enough to hold in your head. Then the two shapes every model here is built from.',
      say: 'Lesson One left you with one honest gap. You called backward, the gradients appeared, and nobody told you how. Today we open it. With a calculator, on numbers small enough to hold in your head. Then the two shapes every model here is made of.' },

    { id: 'a02', scene: 'nn-neuron', step: 0,
      text: 'So. A neural network is one small part, repeated. That\'s the whole architecture. Here\'s the part — three numbers arrive, each one on its own wire.' },

    { id: 'a03', scene: 'nn-neuron', step: 1,
      text: 'Every wire has its own <b>weight</b>. And that word is doing real work: a weight is a number the training loop is allowed to change. Almost nothing else in a layer is.',
      say: 'Every wire has its own weight. And that word is doing real work. A weight is a number the training loop is allowed to change. Almost nothing else in a layer is.' },

    { id: 'a04', scene: 'nn-neuron', step: 2,
      text: 'Multiply each input by its weight, then add. 0.8 + 1.0 + 0.7 = 2.5. That single sum is a <b>dot product</b> — and a layer does 128 of them at once. That\'s why a layer is a matrix multiply, and not a loop.',
      say: 'Multiply each input by its weight, then add. Nought point eight, plus one, plus nought point seven. Two point five. That single sum is a dot product. And a layer does a hundred and twenty eight at once. That is why a layer is a matrix multiply, not a loop.' },

    { id: 'a05', scene: 'nn-neuron', step: 3,
      text: 'Then one more number goes on top. The <b>bias</b>. 2.5 − 0.3 = 2.2. And here\'s what it buys you. Without a bias, every neuron is forced to decide around zero. The layer can rotate the input, and stretch it. Never shift it.',
      say: 'Then one more number goes on top. The bias. Two point five, minus nought point three, is two point two. And here is what it buys. Without a bias, every neuron decides around zero. The layer can rotate the input, and stretch it. Never shift it.' },

    { id: 'a06', scene: 'nn-neuron', step: 5,
      text: 'Last move — the bend. ReLU keeps a positive number and replaces anything else with zero, so 2.2 goes straight through. Now watch. Flip the signs of the inputs, the sum falls to −2.8, and the neuron says nothing at all.',
      say: 'Last move. The bend. ReLU keeps a positive number and replaces anything else with zero, so two point two goes straight through. Now watch. Flip the signs of the inputs, the sum falls to minus two point eight, and the neuron says nothing at all.' },

    { id: 'a07', scene: 'nn-backprop', step: 0,
      text: 'Right. The numbers. One input, one hidden unit, one output, a squared error against the target. Four parameters — the smallest network that still has everything in it. Every value here is real. Check them.' },

    { id: 'a08', scene: 'nn-backprop', step: 1,
      text: '<b>Forward</b>, left to right. 0.5 × 2.0 + 0.1 = 1.1. ReLU leaves a positive number alone. Then −1.5 × 1.1 + 0.4 = −1.25.',
      say: 'Forward, left to right. Nought point five, times two, plus nought point one, is one point one. ReLU leaves a positive number alone. Then minus one point five, times one point one, plus nought point four. Minus one point two five.' },

    { id: 'a09', scene: 'nn-backprop', step: 2,
      text: 'The target was 1.0. So we\'re off by −2.25, and squaring that gives a loss of <b>5.0625</b>. One number. That\'s the whole thing the backward pass exists to shrink.',
      say: 'The target was one. So we are off by minus two point two five, and squaring that gives a loss of five point zero six two five. One number. That is the whole thing the backward pass exists to shrink.' },

    { id: 'a10', scene: 'nn-backprop', step: 3,
      text: '<b>Backward.</b> And we start at the end, where it\'s easiest. The derivative of a square is two times the inside: 2 × (−2.25) = −4.50. That\'s the first link in the chain.',
      say: 'Backward. And we start at the end, where it is easiest. The derivative of a square is two times the inside. Two, times minus two point two five, is minus four point five. That is the first link in the chain.' },

    { id: 'a11', scene: 'nn-backprop', step: 4,
      text: 'Every step to the left is the same move — multiply by one <b>local derivative</b>. Past the second weight: −4.50 × −1.5 = 6.75. Through ReLU: × 1, because the sum was positive.',
      say: 'Every step left is the same move. Multiply by one local derivative. Past the second weight. Minus four point five, times minus one point five, is six point seven five. Through ReLU. Times one, because the sum was positive.' },

    { id: 'a12', scene: 'nn-backprop', step: 5,
      text: 'So where do the weight gradients come from? That same chain. For <b>w₁</b> the local derivative is the input, so 6.75 × 2.0 = 13.50. For <b>w₂</b> it\'s a₁, giving −4.95. A bias is added, never multiplied, so its derivative is always 1.',
      say: 'So where do the weight gradients come from? That same chain. For the first weight the local derivative is the input, so six point seven five times two is thirteen point five. For the second it is the hidden output, giving minus four point nine five. A bias is added, never multiplied. Its derivative is always one.' },

    { id: 'a13', scene: 'nn-backprop', step: 6,
      text: 'Now the trap. Take one plain gradient step with <b>lr = 0.1</b>, and the loss falls from 5.0625 to 0.0225. Excellent, surely? No.',
      say: 'Now the trap. Take one plain gradient step, with a learning rate of nought point one, and the loss falls from five point zero six two five to nought point zero two two five. Excellent, surely? No.' },

    { id: 'a14', scene: 'nn-backprop', step: 6,
      text: 'That step drove z₁ to −2.275. ReLU outputs 0, the answer is now just b₂, and the network hit that loss by <b>ignoring its input</b>. The gradient there is zero from here on. The unit is dead. After one step.',
      say: 'That step drove the hidden sum to minus two point two seven five. ReLU outputs zero, the answer is now just the last bias, and the network hit that loss by ignoring its input. The gradient there is zero from here on. The unit is dead. After one step.' },

    { id: 'a15', scene: 'nn-collapse', step: 0,
      text: 'So why isn\'t the bend optional? Here are two weight matrices, one after the other, with nothing in between. One row of data goes in. One answer comes out.' },

    { id: 'a16', scene: 'nn-collapse', step: 1,
      text: 'And matrix multiplication is associative. So multiply the two <b>weight</b> matrices together first, before any data arrives at all. What you get back is a single matrix.',
      say: 'And matrix multiplication is associative. So multiply the two weight matrices together first, before any data arrives at all. What you get back is a single matrix.' },

    { id: 'a17', scene: 'nn-collapse', step: 2,
      text: 'That single matrix gives the same answer. Not just for this input — for every input. So fifty stacked linear layers are still one matrix. Depth on its own costs memory and time, and returns nothing.' },

    { id: 'a18', scene: 'nn-collapse', step: 4,
      text: 'Now drop a <b>ReLU</b> in the middle. It clips the −4 to 0. And look what that does downstream — (−6, 8) becomes (2, 8).',
      say: 'Now drop a ReLU in the middle. It clips the minus four to zero. And look what that does downstream. Minus six and eight becomes two and eight.' },

    { id: 'a19', scene: 'nn-collapse', step: 5,
      text: 'No fixed matrix can copy that, because the clipping depends on which input arrived. And that\'s the whole argument. Linear layers give a network its <b>size</b>. The bends give it <b>depth</b>.',
      say: 'No fixed matrix can copy that. The clipping depends on which input arrived. And that is the whole argument. Linear layers give a network its size. The bends give it depth.' },

    { id: 'a20', scene: 'nn-acts', step: 1,
      text: 'Right — so which bend? ReLU is the cheapest one that works: keep the positives, zero everything else. But look at the left half of that line. Perfectly flat. Slope exactly 0. That\'s the dead unit from a moment ago, drawn as a picture.',
      say: 'Right. So which bend? ReLU is the cheapest that works. Keep the positives, zero everything else. But look at the left half of that line. Perfectly flat. Slope exactly zero. That is the dead unit from a moment ago, drawn as a picture.' },

    { id: 'a21', scene: 'nn-acts', step: 2,
      text: '<b>GELU</b> is that same shape with the corner rounded off, and <b>SiLU</b>, x·σ(x), has the same character. Put a number on it. At x = −2, ReLU\'s slope is exactly 0, while GELU and SiLU hand back about −0.09. Small. But never nothing.',
      say: 'GELU is that same shape with the corner rounded off. And SiLU, x times sigmoid of x, has the same character. Put a number on it. At an input of minus two, the slope of ReLU is exactly zero. GELU and SiLU hand back about minus nought point zero nine. Small. But never nothing.' },

    { id: 'a22', scene: 'nn-acts', step: 4,
      text: '<b>SwiGLU</b> is different in kind. It isn\'t a curve at all — it\'s a gate. Two projections of the same input, one of them bent by SiLU, then multiplied element by element. One half decides how much of the other half gets through.',
      say: 'SwiGLU is different in kind. It is not a curve at all. It is a gate. Two projections of the same input, one bent by SiLU, then multiplied element by element. One half decides how much of the other gets through.' },

    { id: 'a23', scene: 'nn-init', step: 1,
      text: 'Now — before training starts, every weight is a random number, and that scale is not a detail. Eight layers here, 256 units each. Draw the weights with a standard deviation of <b>0.02</b>, and watch. By layer eight the signal is 150 000 times smaller.',
      say: 'Now, before training starts, every weight is a random number, and that scale is not a detail. Eight layers, two hundred and fifty six units each. Draw the weights with a standard deviation of nought point nought two, and watch. By layer eight the signal is a hundred and fifty thousand times smaller.' },

    { id: 'a24', scene: 'nn-init', step: 3,
      text: 'And nothing crashes. Gradients come back through that same chain, so the early layers barely move. Now go the other way — standard deviation <b>0.20</b> — and the signal is 690 times larger after eight layers. That one ends in <b>nan</b>.',
      say: 'And nothing crashes. Gradients come back through that same chain, so the early layers barely move. Now go the other way. Standard deviation nought point two, and the signal is six hundred and ninety times larger after eight layers. That one ends in not a number.' },

    { id: 'a25', scene: 'nn-init', step: 4,
      text: 'Between them sits one value that holds the signal exactly steady. Two, divided by the number of inputs — then the square root of that. The 2 pays for the half of the signal ReLU throws away. That\'s <b>He initialisation</b>.',
      say: 'Between them sits one value that holds the signal steady. Two, divided by the number of inputs to the layer, then the square root of that. The two pays for the half of the signal ReLU throws away. That is He initialisation.' },

    { id: 'a26',
      text: 'Then you write the layer yourself. And here\'s the part that matters: any tensor you wrap in <b>nn.Parameter</b> inside a module is registered. It reaches the optimizer, it moves to the device, it\'s saved with the model. Forget that wrapper and the tensor never learns.',
      say: 'Then you write the layer yourself. And here is the part that matters. Any tensor you wrap as a parameter inside a module is registered. It reaches the optimizer, moves to the device, and is saved with the model. Forget that wrapper, and it never learns.' },

    { id: 'a27', scene: 'nn-conv', step: 0,
      text: 'One shape left. An MLP flattens a picture into a list of 784 numbers, and throws away the most useful fact about an image — that nearby pixels belong together. A convolution keeps it. Here\'s a picture with one edge in it.',
      say: 'One shape left. A dense network flattens a picture into a list of seven hundred and eighty four numbers, and throws away the most useful fact about an image. Nearby pixels belong together. A convolution keeps it. Here is a picture with an edge in it.' },

    { id: 'a28', scene: 'nn-conv', step: 1,
      text: 'Lay the kernel — nine weights — over the top-left 3 × 3 patch. Multiply the nine pairs, add them up, write down one number. Everything under it here is 0, so the answer is 0.',
      say: 'Lay the kernel, nine weights, over the top left three by three patch. Multiply the nine pairs, add them up, write one number. Everything under it is zero, so the answer is zero.' },

    { id: 'a29', scene: 'nn-conv', step: 2,
      text: 'Now slide one column right. The patch straddles the edge — zeros on one side, ones on the other — and the answer jumps to <b>+3</b>. The detector has fired.',
      say: 'Now slide one column right. The patch straddles the edge. Zeros on one side, ones on the other, and the answer jumps to plus three. The detector has fired.' },

    { id: 'a30', scene: 'nn-conv', step: 4,
      text: 'Then down a row, and across again. And notice what isn\'t happening: those nine weights never change. A detector learned in the top-left corner works in the bottom-right for free. That\'s <b>weight sharing</b>.',
      say: 'Then down a row, and across again. And notice what is not happening. Those nine weights never change. A detector learned in the top left corner works in the bottom right, for free. Weight sharing.' },

    { id: 'a31', scene: 'nn-conv', step: 6,
      text: 'So what does that buy you? A dense layer doing the same job needs 529 984 weights. This kernel needs 10 — nine weights and a bias — and it works on an image of any size.',
      say: 'So what does that buy you? A dense layer doing the same job needs five hundred and twenty nine thousand, nine hundred and eighty four weights. This kernel needs ten. Nine weights and a bias. And it works on any size of image.' },

    { id: 'a32',
      text: 'Two parts finish the classifier. <b>Pooling</b> takes each 2 × 2 block and keeps the largest value: half the width, half the height, and no parameters at all. <b>Normalisation</b> resets the signal size on every forward pass — subtract the mean, divide by the standard deviation, then a learned gain and shift.',
      say: 'Two parts finish the classifier. Pooling takes each two by two block and keeps the largest value. Half the width, half the height, no parameters. Normalisation resets the signal size on every forward pass. Subtract the mean, divide by the standard deviation, then a learned gain and shift.' },

    { id: 'a33',
      text: 'And the two kinds differ in exactly one thing. Which group they average over. <b>Batch norm</b> averages a feature across the other examples in the batch. <b>Layer norm</b> averages one example across its own features, so it never looks at its neighbours — which is why every transformer uses it.',
      say: 'And the two kinds differ in one thing only. Which group they average over. Batch norm averages a feature across the other examples in the batch. Layer norm averages one example across its own features, so it never looks at its neighbours. Which is why every transformer uses it.' },

    { id: 'a34',
      text: 'So — go and build it. The project rebuilds the Lesson One model with no <b>nn.Linear</b> anywhere, makes you write the backward pass by hand and check it against autograd, then moves to images, where convolutions earn their keep. And Lesson Three adds the piece that made language models possible. Attention.',
      say: 'So, go and build it. The project rebuilds the Lesson One model with no ready made linear layer, makes you write the backward pass by hand and check it against autograd, then moves to images, where convolutions earn their keep. Then Lesson Three adds what made language models possible. Attention.' }
  ]
};
