# Talk plan
Projection-Based Private Federated Learning on Compact Riemannian Submanifolds
COMPACT team seminar, IRISA Rennes, 28/09/2026. 60 minutes.

Audience: no prior exposure to Riemannian geometry.
Rule for every slide: one message, one visual, no paragraph.

Budget
  Front matter          2 min    3 slides
  1. Motivation        10 min    5 slides
  2. Federated learning 7 min    4 slides
  3. Geometry primer   13 min    8 slides
  4. SPDNet             6 min    3 slides
  5. Riemannian FL     10 min    5 slides
  6. Privacy            8 min    4 slides
  7. Experiments        6 min    4 slides
  8. Perspectives       4 min    3 slides
  Dividers              2 min    8 slides
                       ------   ---------
                       68 min   47 slides   -> cut 8 min, see "cuts" at the end

Legend
  FIG*  = animated figure, step count given
  FIG   = static figure or plot
  [NEW] = not in the beamer draft, to be validated


## Front matter

### S01 · Title
Visual  : saddle surface, slow camera drift, navy background
On slide: title, name, affiliation, seminar and date, L2S logo
Notes   : one sentence of thanks, then straight into S02

### S02 · Collaborators
Message : this is joint work
Visual  : four cards
On slide: Bouchard (L2S), Ginolhac (LISTIC), Mian (LISTIC), Bellet (Inria)

### S03 · Outline
Message : three obstacles, three answers
Visual  : numbered list, sky circles
On slide: geometry, distribution, privacy
Notes   : announce that the geometry part is a tutorial, no prerequisite


## D1 · Divider "Learning from brain signals"
Kicker  : Motivation
Blurb   : covariance matrices, and why they are not vectors


## 1. Motivation

### S04 · EEG and motor imagery
Message : a BCI records electrical brain activity, and we want to decode the intended movement
Visual  : FIG* eeg-head, 2 steps
Steps   : 1 electrodes light up on the scalp · 2 traces unroll to the right
On slide: trial X in R^{C x T}, C channels, T timestamps, label y
Notes   : name the classes, right hand, left hand, feet, tongue, rest

### S05 · From signals to covariance
Message : the useful information is in how channels co-vary, not in the raw amplitudes
Visual  : FIG* eeg-cov, 3 steps
Steps   : 1 traces centred · 2 one pair (i,j) highlighted, its product accumulates · 3 full matrix fills in
On slide: Sigma = (1/(T-1)) X_bar X_bar^T in S_C^{++}
Refs    : Barachant et al. 2012

### S06 · The SPD cone
Message : covariance matrices form a curved set, not a vector space
Visual  : FIG* spd-cone, 3 steps
Steps   : 1 cone appears · 2 two points and their straight chord · 3 chord shown leaving the cone
On slide: definition of SPD, open convex cone, boundary is det S = 0
Notes   : this is the picture the whole talk rests on. Take your time here.

### S07 · The decoding task
Message : ignoring the structure costs you, exploiting it is the whole point
Visual  : FIG classifier pipeline, Sigma -> h_theta -> p(class | Sigma)
On slide: three options. vec, dimension C^2, symmetry ignored. vech, dimension C(C+1)/2, constraint ignored. Riemannian, constraint built in.

### S08 · Data is scattered
Message : the data that would make this work sits in different hospitals and cannot be pooled
Visual  : FIG* sites, 2 steps
Steps   : 1 three sites with local data · 2 transfer arrows appear and get crossed out
On slide: sensitive data, legal and ethical constraints, no centralisation
Notes   : hand over to section 2


## D2 · Divider "Federated learning"


## 2. Federated learning

### S09 · The setting
Message : train one model on all sites, exchange parameters instead of data
Visual  : none, one equation
On slide: N clients, local datasets D^(i), objective F(theta) = (1/N) sum F_i(theta, D^(i))

### S10 · One communication round
Message : four steps, repeated T times
Visual  : FIG* fed-round, 5 steps
Steps   : 1 broadcast · 2 local optimisation · 3 upload · 4 aggregation · 5 full round replayed fast
On slide: the four steps as short labels, equations appear with their step
Notes   : this replaces four beamer slides

### S11 · FedAvg
Message : in R^d the aggregation step is just an arithmetic mean
Visual  : FIG small, three points and their barycentre in the plane
On slide: theta_{t+1} = (1/k) sum theta_t^(i)
Refs    : McMahan et al. 2017

### S12 · Where this breaks
Message : the mean of points on a curved set is not on the set
Visual  : FIG* spd-cone reused, 2 steps
Steps   : 1 three points on the surface · 2 their mean drops off the surface, marked in red
On slide: one line, "if theta lives on M, the average leaves M"
Notes   : the cliffhanger. Say that the answer needs geometry, and open section 3.


## D3 · Divider "Riemannian geometry"
Kicker  : Tutorial
Blurb   : no prerequisite, everything on one surface


## 3. Geometry primer
All eight slides use the same saddle patch. Same colours throughout.
Accent red is reserved for tangent objects, everywhere in the talk.

### S13 · Manifold and charts
Message : a manifold is a set that looks flat when you zoom in
Visual  : FIG* saddle-charts, 3 steps
Steps   : 1 first domain and its chart flattens out · 2 second domain and chart · 3 overlap and transition map
On slide: chart phi : U -> R^d, smooth transitions on overlaps
Notes   : say "surface" out loud, not "manifold", for the first two minutes

### S14 · Tangent space
Message : a tangent vector is the velocity of a curve through p, and these velocities form a vector space
Visual  : FIG* saddle-tangent, 4 steps
Steps   : 1 curve gamma1 runs with a moving velocity arrow · 2 curve gamma2 runs · 3 plane fades in · 4 both velocities shown together
On slide: T_p M = { gamma_dot(0) : gamma(0) = p }, dimension d
Notes   : this is the only linearisation available on M

### S15 · Riemannian metric
Message : an inner product at every point gives lengths and angles without leaving the surface
Visual  : FIG* saddle-metric, 3 steps
Steps   : 1 two tangent vectors and their angle · 2 ambient gradient appears · 3 it drops onto the plane along the normal
On slide: <.,.>_p induced from the ambient product, grad f(p) = Pi_{T_p M}(nabla f_bar(p))
Notes   : the projection picture is what makes Riemannian gradient descent obvious later

### S16 · Geodesics
Message : the shortest path on the surface is not the straight line of the ambient space
Visual  : FIG* saddle-geodesic, 3 steps
Steps   : 1 second point q appears · 2 straight chord drawn, shown sinking below the surface · 3 geodesic drawn progressively
On slide: nabla_{gamma_dot} gamma_dot = 0, locally length minimising
Notes   : integrate the true geodesic, do not fake the curve

### S17 · Exponential map
Message : exp_p turns a direction and a length into a point on the surface
Visual  : FIG* saddle-exp, 3 steps
Steps   : 1 tangent vector v grows · 2 point walks the geodesic in sync, arriving at exp_p(v) · 3 retraction curve drawn beside it
On slide: exp_p(v) = gamma(1), arc length = ||v||_p. Retraction, first order agreement, cheaper.
Refs    : Absil et al. 2008

### S18 · Logarithmic map
Message : log_p is the inverse, it reads a point as a direction and a distance
Visual  : FIG* saddle-log, 3 steps
Steps   : 1 q appears · 2 shooting animation, initial velocity corrected until the geodesic hits q · 3 vector lifted to the plane
On slide: log_p = exp_p^{-1}, d(p,q) = ||log_p(q)||_p
Notes   : the shooting animation is what makes log feel concrete

### S19 · Three manifolds we need
Message : sphere, Stiefel, SPD, each with the same five objects
Visual  : FIG three columns, small icon per manifold
On slide: table, rows = tangent space, metric, exp, log, gradient
Notes   : do not read the table. Point at Stiefel and SPD only, they are the two we use.

### S20 · Riemannian gradient descent
Message : one line of Euclidean SGD becomes one line of Riemannian SGD
Visual  : FIG* saddle-descent, 3 steps
Steps   : 1 ambient gradient · 2 projection to the tangent plane · 3 retraction step, then the iterates run
On slide: theta <- R_theta(-eta grad F(theta)), side by side with the Euclidean version


## D4 · Divider "SPDNet"


## 4. SPDNet

### S21 · Goal
Message : a network that takes an SPD matrix in and keeps it SPD all the way
Visual  : none or small recap strip
On slide: recall the three options from S07, Riemannian one selected

### S22 · Architecture
Message : BiMap, ReEig, LogEig, then a plain classifier
Visual  : FIG* spdnet-arch, 4 steps
Steps   : 1 BiMap congruence W^T Sigma W · 2 ReEig rectifies eigenvalues · 3 LogEig flattens to the tangent space · 4 FC head and softmax
On slide: dimensions at each stage, which parts are learnable
Refs    : Huang and Van Gool 2017

### S23 · Where the parameters live
Message : the weights are not free, they are constrained to the Stiefel manifold
Visual  : FIG small, Stiefel constraint box
On slide: St(d,p) = { X in R^{d x p} : X^T X = I_p }. Learnable parameters (W, eigenvalue threshold).
Notes   : say explicitly, this is the theta of section 2, and it lives on M. Close the loop with S12.


## D5 · Divider "Riemannian federated learning"   [NEW section from here]


## 5. Riemannian FL

### S24 · What has to change
Message : two of the four steps of a round stop making sense on a manifold
Visual  : FIG* fed-round reused, 2 steps
Steps   : 1 the four steps replayed, steps 2 and 4 highlighted in red · 2 question marks on local update and aggregation
On slide: broadcast and upload are fine. Local optimisation must stay on M. Aggregation must be geometric.

### S25 · Local step
Message : the local update is Riemannian SGD, which we already have from S20
Visual  : FIG small, reuse the descent picture
On slide: E local epochs, theta_t^(i) obtained by Riemannian SGD from theta_t

### S26 · Aggregation, existing answers
Message : the natural answers are expensive or only defined locally
Visual  : FIG comparison strip
On slide: Karcher mean, tangent mean, RetAvg with R^{-1}. Cost and definition issues for each.
Refs    : to check

### S27 · Our two proposals
Message : average in the ambient space, then come back to the manifold
Visual  : FIG* projavg, 4 steps
Steps   : 1 local iterates on M · 2 ambient mean, off M, marked · 3 projection back onto M · 4 RLAvg variant shown as a lifted version
On slide: ProjAvg, theta_{t+1} = Pi((1/k) sum theta_t^(i)). RLAvg, theta_{t+1} = Pi(theta_t + (1/k) sum L_{theta_t}(theta_t^(i))).
Notes   : for Stiefel the projection is the polar factor, cheap and closed form

### S28 · Algorithm and guarantee
Message : RFedSGD converges under partial participation and heterogeneous clients
Visual  : FIG algorithm box, then the theorem statement
On slide: algorithm pseudo-code left, convergence rate right, assumptions listed short
Notes   : state the assumptions, do not prove anything


## D6 · Divider "Privacy"


## 6. Privacy   [NEW]

### S29 · Federated is not private
Message : parameters leak, so we need a formal guarantee, not an argument
Visual  : FIG* threat model, 2 steps
Steps   : 1 an observer watches the uploads · 2 one record is swapped, the observer should not notice
On slide: record-level DP, substitution adjacency, who is the adversary

### S30 · Differential privacy in one slide
Message : indistinguishability of two neighbouring datasets, measured as a hypothesis test
Visual  : FIG trade-off curve, two Gaussians
On slide: (eps, delta)-DP, then f-DP and Gaussian DP, why the test view is the convenient one

### S31 · DP-RFedProj
Message : clip and add noise in the ambient space, then project back onto the manifold
Visual  : FIG* dp-mechanism, 4 steps
Steps   : 1 per-sample gradients · 2 clipping to radius C in the tangent space · 3 Gaussian noise · 4 projection back to M
On slide: the mechanism in three lines
Notes   : the key claim, privacy is decided before the projection, so the geometry costs nothing

### S32 · Guarantee and price
Message : the guarantee is geometry free, and the accountant is much tighter than the alternative
Visual  : FIG accounting comparison
On slide: geometry-free reduction, subsampling amplification, CLT corollary. eps = 2.22 where PriRFed certifies 20.
On slide: nu = 2C^2/(B^2 sigma^2), three regimes


## D7 · Divider "Experiments"


## 7. Experiments   [NEW]

### S33 · Protocol
Message : three MOABB datasets, one client per subject, honest symmetric comparison
Visual  : FIG dataset table
On slide: BNCI2014-001, Cho2017, Weibo2014. SPDNet and EEGNet. ProjAvg, RLAvg, RetAvg. HTCondor campaign.

### S34 · Without privacy
Message : RetAvg is the strongest aggregation, but it needs small learning rates
Visual  : FIG accuracy plot, exported SVG
On slide: aggregation comparison, one figure

### S35 · With privacy
Message : the ranking flips, SPDNet wins at every finite epsilon
Visual  : FIG accuracy versus epsilon, exported SVG
On slide: EEGNet wins non-privately, SPDNet wins under DP

### S36 · Why
Message : the advantage is a DP-compatibility cost, not noise robustness
Visual  : FIG bar chart of the cost decomposition
On slide: 0 to 1.4 points for SPDNet against 9.7 to 15.6 for EEGNet. Local FC head cuts clipping norms.


## D8 · Divider "Perspectives"


## 8. Perspectives   [NEW]

### S37 · Trunk or head
Message : we do not yet know what carries the performance, representation or personalisation
Visual  : FIG 2x2 factorial grid
On slide: shared and random trunks, shared and personal heads. Ongoing work.

### S38 · Conclusion
Message : geometry, distribution and privacy can be handled together, and the geometry is free
Visual  : the saddle from S01, final frame
On slide: three bullets, one per obstacle

### S39 · Thanks and references
Visual  : logos
On slide: contact, paper status, bibliography on the next scrollable slide


## Cuts if the talk runs long
  1. S19, the three manifolds table. Say it in one sentence over S18.
  2. S11, FedAvg. Merge into S10.
  3. S26, existing aggregations. Reduce to one line on S27.
  4. S34. Show only the private results.

## Animated figure inventory, for step 3 of the build
  saddle family, one renderer, six overlays : S13 S14 S15 S16 S17 S18 S20
  eeg-head, eeg-cov                          : S04 S05
  spd-cone, reused                           : S06 S12
  sites                                      : S08
  fed-round, reused                          : S10 S24
  spdnet-arch                                : S22
  projavg                                    : S27
  dp-mechanism, threat model                 : S29 S31
  static plots exported from matplotlib      : S34 S35 S36