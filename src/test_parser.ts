// /* eslint-disable */

// // import {parseMol2} from "molstar/lib/mol-io/reader/mol2/parser";
// // import {to_mmCIF} from "molstar/lib/mol-model/structure/export/mmcif";
// // import {DataBuilder} from "molstar/lib/mol-plugin-state/builder/data";

// // @ts-ignore
// // import {Viewer} from "molstar/build/viewer/molstar";

// // console.log(Viewer);

// // var $ = require("jquery");

// import 'jquery';
// // import 'expose-loader?$!expose-loader?jQuery!jquery';
// // require("expose-loader?$!jquery");

// import * as $3Dmol from '3dmol/build/3Dmol-nojquery.js';

// // console.log($3Dmol);

// // @ts-ignore
// // import * as mol3d from "3dmol/3Dmol/3dmol";
// // import * as mol3d from "3dmol/3Dmol/parsers";
// // import * as mol3d from "./3Dmol-nojquery";
// // console.log("XXX", mol3d);

// // declare var molstar;

// // ./build/viewer/molstar.js


// const mol2Txt = `@<TRIPOS>MOLECULE
// *****
//  83 85 0 0 0
// SMALL
// GASTEIGER

// @<TRIPOS>ATOM
//       1 O          -0.4188    7.2012    0.2074 O.3     1  UNL1       -0.3449
//       2 C          -0.2414    8.5901   -0.0529 C.3     1  UNL1        0.0744
//       3 C           1.1817    8.7271   -0.5175 C.3     1  UNL1        0.0744
//       4 O           1.5420    7.4167   -0.9587 O.3     1  UNL1       -0.3449
//       5 C           0.8410    6.5653   -0.0521 C.3     1  UNL1        0.1867
//       6 C           0.7343    4.9624   -0.3487 C.ar    1  UNL1        0.0244
//       7 C           1.8367    3.9810   -0.4669 C.ar    1  UNL1        0.0341
//       8 C           3.3053    4.0011   -0.4032 C.1     1  UNL1       -0.0653
//       9 C           4.3648    3.3648   -0.3117 C.1     1  UNL1       -0.0910
//      10 C           5.5571    2.4160   -0.1903 C.3     1  UNL1        0.0239
//      11 C           6.7750    3.2937   -0.0208 C.3     1  UNL1       -0.0491
//      12 C           5.8196    1.2372   -1.2109 C.3     1  UNL1       -0.0491
//      13 C           5.2756    1.6069    1.0875 C.3     1  UNL1       -0.0491
//      14 C           1.5557    2.6029   -0.5537 C.ar    1  UNL1       -0.0293
//      15 C           0.3311    2.0156   -0.5089 C.ar    1  UNL1        0.0418
//      16 C          -0.7830    2.8706   -0.4068 C.ar    1  UNL1        0.0408
//      17 C          -2.0801    2.1791   -0.4254 C.1     1  UNL1       -0.0645
//      18 C          -3.0574    1.4402   -0.4563 C.1     1  UNL1       -0.0910
//      19 C          -4.2807    0.5603   -0.4931 C.3     1  UNL1        0.0239
//      20 C          -4.0754   -0.4558   -1.6307 C.3     1  UNL1       -0.0491
//      21 C          -4.5305   -0.3380    0.7441 C.3     1  UNL1       -0.0491
//      22 C          -5.4923    1.4478   -0.7270 C.3     1  UNL1       -0.0491
//      23 C          -0.5812    4.3239   -0.3399 C.ar    1  UNL1       -0.0360
//      24 C           0.3617    0.5064   -0.5386 C.1     1  UNL1       -0.0598
//      25 C           0.5493   -0.7238   -0.5721 C.1     1  UNL1       -0.0609
//      26 C           0.6944   -2.2195   -0.6071 C.ar    1  UNL1        0.0276
//      27 C          -0.4986   -2.9704   -0.4894 C.ar    1  UNL1       -0.0308
//      28 C          -0.4762   -4.3780   -0.5101 C.ar    1  UNL1        0.0272
//      29 C          -1.6058   -5.2664   -0.3429 C.1     1  UNL1       -0.0662
//      30 C          -2.3641   -6.2059   -0.2252 C.1     1  UNL1       -0.0970
//      31 C          -3.2262   -7.4046   -0.0898 C.3     1  UNL1        0.0092
//      32 C          -2.9907   -8.4825   -1.1781 C.3     1  UNL1       -0.0450
//      33 C          -2.6984   -9.9161   -0.7050 C.3     1  UNL1       -0.0644
//      34 C           0.7132   -5.0442   -0.6689 C.ar    1  UNL1       -0.0308
//      35 C           1.9259   -4.3942   -0.7794 C.ar    1  UNL1        0.0272
//      36 C           2.9929   -5.3968   -0.9450 C.1     1  UNL1       -0.0662
//      37 C           3.4411   -6.5318   -1.0892 C.1     1  UNL1       -0.0970
//      38 C           3.5365   -8.0207   -1.2819 C.3     1  UNL1        0.0092
//      39 C           3.6940   -8.8454    0.0250 C.3     1  UNL1       -0.0450
//      40 C           3.2532  -10.3143   -0.1522 C.3     1  UNL1       -0.0644
//      41 C           1.9425   -2.9537   -0.7394 C.ar    1  UNL1       -0.0308
//      42 H          -0.4429    9.2380    0.8384 H       1  UNL1        0.0584
//      43 H          -0.9375    8.9503   -0.8523 H       1  UNL1        0.0584
//      44 H           1.8110    9.0593    0.3469 H       1  UNL1        0.0584
//      45 H           1.2874    9.5371   -1.2841 H       1  UNL1        0.0584
//      46 H           1.4128    6.5920    0.8989 H       1  UNL1        0.0965
//      47 H           6.9669    3.8557   -0.9552 H       1  UNL1        0.0244
//      48 H           7.6611    2.6920    0.2553 H       1  UNL1        0.0244
//      49 H           6.5632    4.0130    0.8001 H       1  UNL1        0.0244
//      50 H           6.0907    1.5651   -2.2295 H       1  UNL1        0.0244
//      51 H           4.9817    0.5062   -1.2822 H       1  UNL1        0.0244
//      52 H           6.6990    0.6157   -0.8634 H       1  UNL1        0.0244
//      53 H           5.0446    2.2892    1.9245 H       1  UNL1        0.0244
//      54 H           6.1602    0.9939    1.3749 H       1  UNL1        0.0244
//      55 H           4.4120    0.9161    0.9450 H       1  UNL1        0.0244
//      56 H           2.3618    1.8843   -0.6409 H       1  UNL1        0.0642
//      57 H          -3.1993   -1.1094   -1.4286 H       1  UNL1        0.0244
//      58 H          -3.9134    0.0675   -2.5925 H       1  UNL1        0.0244
//      59 H          -4.9705   -1.1095   -1.7432 H       1  UNL1        0.0244
//      60 H          -3.6906   -1.0343    0.9391 H       1  UNL1        0.0244
//      61 H          -5.4424   -0.9703    0.5698 H       1  UNL1        0.0244
//      62 H          -4.7349    0.2620    1.6499 H       1  UNL1        0.0244
//      63 H          -5.3090    2.0962   -1.6084 H       1  UNL1        0.0244
//      64 H          -5.6642    2.0862    0.1638 H       1  UNL1        0.0244
//      65 H          -6.3951    0.8321   -0.9153 H       1  UNL1        0.0244
//      66 H          -1.4524    4.9606   -0.2429 H       1  UNL1        0.0635
//      67 H          -1.4380   -2.4550   -0.3696 H       1  UNL1        0.0642
//      68 H          -4.2849   -7.1036   -0.0314 H       1  UNL1        0.0397
//      69 H          -2.8743   -7.8985    0.8441 H       1  UNL1        0.0397
//      70 H          -2.1692   -8.1782   -1.8560 H       1  UNL1        0.0272
//      71 H          -3.9451   -8.5454   -1.7421 H       1  UNL1        0.0272
//      72 H          -1.7160   -9.9709   -0.1943 H       1  UNL1        0.0230
//      73 H          -2.6560  -10.5967   -1.5889 H       1  UNL1        0.0230
//      74 H          -3.4913  -10.2932   -0.0289 H       1  UNL1        0.0230
//      75 H           0.6877   -6.1318   -0.6947 H       1  UNL1        0.0642
//      76 H           4.4327   -8.2851   -1.8793 H       1  UNL1        0.0397
//      77 H           2.5540   -8.3401   -1.6880 H       1  UNL1        0.0397
//      78 H           3.0596   -8.4233    0.8306 H       1  UNL1        0.0272
//      79 H           4.7551   -8.8415    0.3525 H       1  UNL1        0.0272
//      80 H           2.1734  -10.3678   -0.4188 H       1  UNL1        0.0230
//      81 H           3.3841  -10.8855    0.7954 H       1  UNL1        0.0230
//      82 H           3.8386  -10.8202   -0.9453 H       1  UNL1        0.0230
//      83 H           2.8852   -2.4294   -0.8252 H       1  UNL1        0.0642
// @<TRIPOS>BOND
//      1     1     2    1
//      2     2     3    1
//      3     3     4    1
//      4     4     5    1
//      5     1     5    1
//      6     5     6    1
//      7     6     7   ar
//      8     7     8    1
//      9     8     9    3
//     10     9    10    1
//     11    10    11    1
//     12    10    12    1
//     13    10    13    1
//     14     7    14   ar
//     15    14    15   ar
//     16    15    16   ar
//     17    16    17    1
//     18    17    18    3
//     19    18    19    1
//     20    19    20    1
//     21    19    21    1
//     22    19    22    1
//     23    16    23   ar
//     24     6    23   ar
//     25    15    24    1
//     26    24    25    3
//     27    25    26    1
//     28    26    27   ar
//     29    27    28   ar
//     30    28    29    1
//     31    29    30    3
//     32    30    31    1
//     33    31    32    1
//     34    32    33    1
//     35    28    34   ar
//     36    34    35   ar
//     37    35    36    1
//     38    36    37    3
//     39    37    38    1
//     40    38    39    1
//     41    39    40    1
//     42    35    41   ar
//     43    26    41   ar
//     44     2    42    1
//     45     2    43    1
//     46     3    44    1
//     47     3    45    1
//     48     5    46    1
//     49    11    47    1
//     50    11    48    1
//     51    11    49    1
//     52    12    50    1
//     53    12    51    1
//     54    12    52    1
//     55    13    53    1
//     56    13    54    1
//     57    13    55    1
//     58    14    56    1
//     59    20    57    1
//     60    20    58    1
//     61    20    59    1
//     62    21    60    1
//     63    21    61    1
//     64    21    62    1
//     65    22    63    1
//     66    22    64    1
//     67    22    65    1
//     68    23    66    1
//     69    27    67    1
//     70    31    68    1
//     71    31    69    1
//     72    32    70    1
//     73    32    71    1
//     74    33    72    1
//     75    33    73    1
//     76    33    74    1
//     77    34    75    1
//     78    38    76    1
//     79    38    77    1
//     80    39    78    1
//     81    39    79    1
//     82    40    80    1
//     83    40    81    1
//     84    40    82    1
//     85    41    83    1
// `;

// export function test() {
//     let mol2 = $3Dmol.Parsers.MOL2(mol2Txt, {
//         keepHs: true,
//     });
//     debugger;
//     // var viewer = new molstar.Viewer('app2', {
//     //     layoutIsExpanded: false,
//     //     layoutShowControls: false,
//     //     layoutShowRemoteState: false,
//     //     layoutShowSequence: false,
//     //     layoutShowLog: false,
//     //     layoutShowLeftPanel: false,

//     //     viewportShowExpand: false,
//     //     viewportShowSelectionMode: false,
//     //     viewportShowAnimation: false,
//     //     viewportShowControls: false,
//     //     viewportShowSettings: false,

//     //     pdbProvider: 'rcsb',
//     //     emdbProvider: 'rcsb',
//     // });
//     // viewer.loadStructureFromData(mol2Txt, 'mol2');

//     // let btns = document.querySelectorAll(".msp-btn");
//     // for (let btn of btns) {
//     //     (btn as HTMLElement).style.display = "none";
//     // }
//     // // @ts-ignore
//     // window.viewer = viewer;
//     // return
//     // viewer.loadPdb('7bv2');
//     // viewer.loadEmdb('EMD-30210', { detail: 6 });
//     // return;

//     // const task = parseMol2(mol2Txt, "nanokind").run().then((out) => {
//     //     console.log(out);
//     //     // @ts-ignore
//     //     for (const structure of out.result.structures) {
//     //         console.log(structure);
//     //     }
//     // });
// }