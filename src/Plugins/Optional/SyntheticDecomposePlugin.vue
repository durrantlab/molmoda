<!-- Here I want you to make a new plugin. It acts on compounds. It decomposes them into
fragments, according to these reactions: -->


const reactions: IReaction[] = [
{
id: 1,
name: "Formation of acetals and ketals from aldehydes/ketones",
smirks: "[C:7][O:6][C:1][O:3][C:4]>>[C:7][O:6][H].[C:4][O:3][H].[O]=[C:1]",
functionalGroup: "ACETALS and KETALS",
transformType: "FGE"
},
// ... Add all other reactions from the comment block
];


<!-- ID	Name	SMIRKS	FunctionalGroup	TransformType
1	Formation of acetals and ketals from aldehydes/ketones	[C:7][O:6][C:1][O:3][C:4]>>[C:7][O:6][H].[C:4][O:3][H].[O]=[C:1]	ACETALS and KETALS	FGE
2	Synthesis of acid chlorides From Carboxylic Acids	[C:3][C:1](=[O:2])[Cl]>>[C:3][C:1](=[O:2])[O][H]	ACID CHLORIDES	FGE
3	Synthesis of alcohols from acid chlorides 	[#6:7][C:1](=[O:2])[Cl]>>[#6:7][C:1]([H])([H])[O:2][H]	ALCOHOLS	FGE
4	Synthesis of alcohols from anhydrides	[#6:7][C:1](=[O:2])[O][C](=[O])[C]>>[#6:7][C:1]([H])([H])[O:2][H]	ALCOHOLS	FGE
5	Reduction of esters to alcohols	[#6:7][C:1](=[O:2])[O:3][#6:4]>>[#6:7][C:1]([H])([H])[O:2][H].[O:3]([H])[#6:4]	ALCOHOLS	FGE
6	Hydration of alkenes	[H][C:2][C:1][O][H]>>[C:1]=[C:2]	ALCOHOLS	FGE
7	Ether formation from alcohols	[C:1][O:2][C:3]>>[C:1][O:2][H].[H][O][C:3]	ETHERS	FGE
8	Reduction of aldehydes/ketones	"[H,C:4][C:1]([H])([#6:5])[O:2][H]>>[H,C:4][C:1](=[O:2])[#6:5]"	ALCOHOLS	FGE
9	Reduction of conjugated aldehydes/ketones	"[H,C:4][C:1]([H])([O:2][H])[C:5][C:3]>>[H,C:4][C:1](=[O:2])[C:5][C:3]"	ALCOHOLS	FGE
10	Halohydrin formation from Alkenes	[C:1]([O][H])[C:2][Cl]>>[C:1]=[C:2]	ALCOHOLS-FUNCTIONALIZED	FGE
11	Aldehydes From Acetals	[C:7][O:6][C:1][O:3][C:4]>>[C:7][O:6][H].[C:4][O:3][H].[O]=[C:1]	ALDEHYDES or KETONES	FGE
12	Oxidation of secondary alcohols to ketones	[C:3][C:1]([C:4])=[O:2]>>[C:3][C:1]([H])([C:4])[O:2][H]	ALDEHYDES or KETONES	FGE
13	Ozonolysis of alkenes	[C:1]=[C:2]>>[C:1]=[O].[C:2]=[O]	ALDEHYDES or KETONES	FGE
14	Hydration of terminal alkynes	[C:1]([H])([H])[C:2]([H])[O]>>[C:1]#[C:2]([H])	ALDEHYDES	FGE
15	Oxidation of vicinal diols to aldehydes or ketones	"[O:3]([H])[C:1]([H,C:4])[C:2]([H,C:6])[O:5][H]>>[O:3]=[C:1]([H,C:4]).[C:2]([H,C:6])=[O:5]"	ALDEHYDES or KETONES	FGE
16	Reduction of nitriles to aldehydes	[C:1][C:2](=[O])[H]>>[C:1][C:2]#[N]	ALDEHYDES or KETONES	FGE
17	Reduction of Alkenes to Alkanes	[C:1]([H])[C:2]([H])>>[C:1]=[C:2]	ALKANES	FGE
18	Reduction of cyclic alkenes	[C:1]([H])1[C:2]([H])[C:3]([H])[C:4]([H])[C:5]([H])[C:6]([H])1>>[C:1]1[C:2]=[C:3][C:4]=[C:5][C:6]=1	ALKANES	FGE
19	Reduction of alkyl halides	[C:1]([H])[C:2]>>[Cl][C:1][C:2]	ALKANES	FGE
20	Reduction of Ketones or Aldehydes	[C:3][C:1]([H])([H])[C:2]>>[C:3][C:1](=[O])[C:2]	ALKANES	FGE
21	Reduction of Alkynes to Alkenes	[C:1]([H])=[C:2]([H])>>[C:1]#[C:2]	ALKENES	FGE
22	Beta HX elimination	[C:3][C:2]=[C:1]>>[C:3][C:1][C:2]([H])[Cl]	ALKENES	FGE
23	Alkene formation from Sulfonate Esters (elimination)	[C:1]=[C:2]>>[C:1]([H])[C:2][O][S](=[O])(=[O])([C]([H])([H])([H]))	ALKENES	FGE
24	Alkene formation from Ammonium Salts (elimination)	[C:3][C:1]([C:2]([H]))[N]([C])([C])>>[C:3][C:1]=[C:2]	ALKENES	FGE
25	Alkyne formation from Alkenyl Halides (elimination)	[C:1]#[C:2]>>[Br][C:2]=[C:1][H]	ALKYNES	FGE
26	Synthesis of amides from carboxylic acids	[N][C:1](=[O:2])[C:7]>>[C:7][C:1](=[O:2])[O][H]	AMIDES	FGE
27	Synthesis of amides from acyl chloride	[#6:4][N:5][C:1]=[O:2]>>[#6:4][N:5][H].[O:2]=[C:1][Cl]	AMIDES	FGE
28	Synthesis of amides from esters	[N:3][C:1](=[O:2])[C:7]>>[C:7][C:1](=[O:2])[O][C]([H])([H])[C]([H])([H])([H]).[N:3][H]	AMIDES	FGE
29	Synthesis of amides from anhydrides	[N:3][C:1](=[O:2])[C:7]>>[C:7][C:1](=[O:2])[O][C](=[O])[C]([H])([H])[C]([H])([H])([H]).[N:3][H]	AMIDES	FGE
30	Catalytic hydration of nitriles to amides	[C:1][C:2](=[O])[O][H]>>[C:1][C:2]#[N]	AMIDES	FGE
31	Reduction of alkyl azides to amines	[C:2][N:1]([H])([H])>>[N-]=[N+]=[N:1][C:2]	AMINES	FGE
32	Amines From Imides	[C:2][N:1]([H])([H])>>[C:2][N:1]([C](=O)[C]([H])([H])[C]([H])([H])([H]))([C](=O)[C]([H])([H])[C]([H])([H])([H]))	AMINES	FGE
33	Amines From Halides	[C:2][NX3:1]>>[NX3:1][H].[C:2][Cl]	AMINES	FGE
34	Reduction of nitriles to amines	[C:1][C:2]([H])([H])[N:3]([H])[H]>>[N:3]#[C:2][C:1]	AMINES	FGE
35	Reduction of nitro compounds to amines or anilines	[#6:1][N:2]([H])([H])>>[#6:1][NX3+:2](=[O])[O-]	AMINES	FGE
36	Synthesis of anhydrides	[O:6]=[C:5][O:3][C:1]=[O:2]>>[O:2]=[C:1][O:3][H].[O:6]=[C:5][Br]	ANHYDRIDES	FGE
37	Carboxylic acids From Acid chlorides	[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[Cl]	CARBOXYLIC ACIDS	FGE
38	Carboxylic acids From Anhydrides	[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[O][C](=[O])[C]([H])([H])[C]([H])([H])([H])	CARBOXYLIC ACIDS	FGE
39	Carboxylic acids From Esters	[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[O][C]([H])([H])[C]([H])([H])([H])	CARBOXYLIC ACIDS	FGE
40	Carboxylic acids From Amides	[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[N]([H])([H])	CARBOXYLIC ACIDS	FGE
41	Oxidation of primary alcohols to carboxylic acids	[O:2]=[C:1][O][H]>>[C:1]([H])([H])[O:2][H]	CARBOXYLIC ACIDS	FGE
42	Decarboxylation	[C:5]([H])[C:1](=[O:2])[O:3][H]>>[H][O:3][C:1](=[O:2])[C:5][C](=[O])[O][H]	CARBOXYLIC ACIDS	FGE
43	Hydrolysis of nitriles to carboxylic acids	[C:1][C:2](=[O])[O][H]>>[C:1][C:2]#[N]	CARBOXYLIC ACIDS	FGE
44	Birch reduction	[C:1]([H])1[C:2]=[C:3][C:4]([H])[C:5]=[C:6]1>>[C:1]1=[C:2][C:3]=[C:4][C:5]=[C:6]1	DIENES	FGE
45	Hydroxylation of alkenes	[H][O][C:1][C:2][O][H]>>[C:1]=[C:2]	DIOLS	FGE
46	Cleavage of epoxides	[O][C:1][C:2][O]>>[C:1]1O[C:2]1	DIOLS	FGE
47	Enamine formation	[N:1][C:2]=[C:3]>>[N:1][H].[O]=[C:2][C:3][H]	ENAMINES	FGE
48	Oxidation of alkenes with peracids	[C:2]([H])1[C:1][O:3]1>>[C:1]=[C:2][C]([H])([H])([H]).[C]([H])([H])([H])[C](=[O])[O][O:3][H]	EPOXIDES	FGE
49	Epoxide formation from Halohydrins	[C:2]1[C:1][O:3]1>>[C:1]([O:3][H])[C:2][Cl]	EPOXIDES	FGE
50	Fischer esterification	[O:2]=[C:1][O:6][C:8]>>[H][O:6][C:8].[O:2]=[C:1][O][H]	ESTERS	FGE
51	Acylation with acid chlorides	[O:2]=[C:1][O:6][C:8]>>[H][O:6][C:8].[O:2]=[C:1][Cl]	ESTERS	FGE
52	Acylation with anhydrides	[O:2]=[C:1][O:6][C:8]>>[H][O:6][C:8].[O:2]=[C:1][O][C](=[O])[C]([H])([H])([H])	ESTERS	FGE
53	Esterification of alcohols	[O:2]=[C:1][O:6][#6:8]>>[H][O:6][#6:8].[O:2]=[C:1][O][C]([H])([H])([H])	ESTERS	FGE
54	Oxidation of ketones I	[C:1][C:2](=[O])[O][C:3]>>[C:1][C:2](=[O])[C:3]	ESTERS	FGE
55	Oxidation of ketones II	[C:3][C:2](=[O])[O][C:1]>>[C:1][C:2](=[O])[C:3]	ESTERS	FGE
56	Williamson ether synthesis	[C:1][O:2][C:4]>>[C:1][O:2][H].[C:4][Cl]	ETHERS	FGE
57	Halogenation of alcohols with hydrogen halides	[C:1][Cl:2]>>[C:1][O][H].[Cl:2][H]	HALIDES (ALKYL)	FGE
58	Halogenation	[#6:1][Cl]>>[#6:1]([H])	HALIDES (ALKYL)	FGE
59	Hydrogen halide addition to alkenes	[Cl][C:1][C:3]([H])>>[C:1]=[C:3]	HALIDES (ALKYL)	FGE
60	Halogen addition to alkenes	[Cl][C:1][C:3]([Cl])>>[C:1]=[C:3]	HALIDES (ALKYL)	FGE
61	Hydrogen halide addition to alkynes	[Cl:3][C:2]=[C:1][H:4]>>[C:1]#[C:2].[Cl:3][H:4]	HALIDES (ALKENYL) 	FGE
62	Condensation of primary amines and oxocompounds	[C:2]=[N][H]>>[O]=[C:2]	IMINES	FGE
63	Hydartion of alkynes	[C:1]([H])([H])[C:2](=[O])[C:3]([H])([H])>>[C:1]([H])([H])[C:2]#[C:3]	KETONES or ALDEHYDES	FGE
64	Oxidation of vicinal diols	[O:3]([H])[C:1]([C:4])[C:2]([C:7])([C:6])[O:5][H]>>[O:3]=[C:1]([C:4]).[C:2]([C:7])([C:6])=[O:5]	KETONES or ALDEHYDES	FGE
65	Decarboxylation of ?-ketoacid	[C:1]([H])[C:2](=[O:3])>>[C:1]([C](=[O])[O][H])[C:2](=[O:3])	KETONES or ALDEHYDES	FGE
66	Dehydration of amides to nitriles	[C:1][C:2]#[N:3]>>[C:1][C:2](=[O])[N:3]([H])[H]	NITRILES	FGE
67	Nitration of Aromatic Hydrocarbons	[c;H0:1][N+]([O-])=[O]>>[c:1][H]	NITRO COMPOUNDS	FGE
68	Alkyl Lithium formation from alkyl halides	[C:1][Li]>>[C:1][Cl]	ORGANOMETALLICS	FGE
69	Aryl Halides to Phenols	[c:1][O][H]>>[c:1][Cl]	PHENOLS	FGE
70	Primary Anilines to Phenols	[c:1][O][H]>>[c:1][N]([H])([H])	PHENOLS	FGE
71	Sulfonation of aromatic hydrocarbons	[c:1][S](=[O])(=[O])[O][H]>>[c:1]([H])	SULFONIC ACIDS	FGE
72	Grignard Alcohol From Acid Chloride and Organometallics	[C:1][C:4]([C:2])([C:6])[O:5][H]>>[C:1][Mg][Br].[C:2][Mg][Br].[C:6][C:4](=[O:5])[Cl]	ALCOHOLS	C-C
73	Grignard Alcohol From Anhydride and Organometallics	[C:1][C:4]([C:2])([C:6])[O:5][H]>>[C:1][Mg][Br].[C:2][Mg][Br].[C:6][C:4](=[O:5])[O][C](=[O])[C]([H])([H])[C]([H])([H])([H])	ALCOHOLS	C-C
74	Grignard Alcohol From Esters and Organometallics	[C:1][C:4]([C:2])([C:6])[O:5][H]>>[C:1][Mg][Br].[C:2][Mg][Br].[C:6][C:4](=[O:5])[O][C]([H])([H])[C]([H])([H])([H])	ALCOHOLS	C-C
75	Grignard Alcohol From Epoxides	[C:4][C:2]([H])[C:1][O:3][H]>>[C:2]([H])1[C:1][O:3]1.[C:4][Mg][Br]	ALCOHOLS	C-C
76	Grignard reaction to carbonyl compounds	[C:3][C:1][O:2][H]>>[C:1]=[O:2].[Cl][Mg][C:3]	ALCOHOLS	C-C
77	?-hydroxyester formation	"[O:6]([H])[C:5]([C:4])([H,C:7])[C:2][C:1](=[O:3])[O:8][C:9]>>[C:4][C:5]([H,C:7])=[O:6].[C:2]([H])[C:1](=[O:3])[O:8][C:9]"	ALCOHOLS-ESTERS	C-C
78	Alkylation of aldehydes/ketones	[C:1][C:2][C:3](=[O:5])[C:4]>>[C:1][I].[C:2]([H])[C:3](=[O:5])[C:4]	ALDEHYDES and KETONES	C-C
79	Aromatic aldehydes fom Organometallics 	[c:1][C](=[O])[H]>>[c:1][Mg][Br]	ALDEHYDES and KETONES	C-C
80	Claisen rearrangement	[C:1](=[O:2])[C:6][C:5][C:4]=[C:3]>>[C:6]=[C:1][O:2][C:3][C:4]=[C:5]	ALDEHYDE-ALKENES	C-C
81	[2+2]-photocycloaddition	[C:1]1[C:2][C:3][C:4]1[C:5]>>[C:1]=[C:2].[C:3]=[C:4][C:5]	ALKANES	C-C
82	[2+2]-photocycloaddition	[C:1]1[C:2][C:4]([C;R0:5])[C:3]1>>[C:1]=[C:2].[C:3]=[C:4][C:5]	ALKANES	C-C
83	Negishi coupling	[C:1][C:2]>>[C:1][Zn][Cl].[C:2][Cl]	ALKANES	C-C
84	Heck reaction	[C:1]=[C:2][#6:3]>>[C:1]=[C:2]([H]).[#6:3][Cl]	ALKENES	C-C
85	Diels-Alder cycloaddition	[C:1]1[C:2]=[C:3][C:4][C:5][C:6]1>>[C:1]=[C:2][C:3]=[C:4].[C:5]=[C:6]	ALKENES	C-C
86	Ring Closing Metathesis	[C:1]=[C:2]CCCC[C:3]=[C:4]>>[C:2]1=[C:3]C([H])([H])C([H])([H])C([H])([H])C([H])([H])1.[C:1]=[C:4]	ALKENES	C-C
87	Wittig reaction	[C:1]=[C:2]>>[C:1]=[O].[C:2]([H])[Cl]	ALKENES	C-C
88	Sonogashira coupling	[C:1]=[#6:2][C:3]#[#6:4]([H])>>[C:1]=[#6:2][Cl].[#6:4]([H])#[C:3]([H])	ALKYNES	C-C
89	Alkyne-alcohol formation	[C:1]#[C:2][C:4]([C:3])([O:6][H])[C:5]>>[C:1]#[C:2][Na].[C:3][C:4](=[O:6])[C:5]	ALKYNE-ALCOHOLS	C-C
90	Friedel-Crafts alkylation	[c:1][C:3]>>[c:1].[Cl][C:3]	ARENES	C-C
91	Suzuki coupling	[c;H0:1][c;H0:2]>>[c;H1:1][Cl].[c;H1:2][B]([O][H])[O][H]	BIARYLS	C-C
92	Grignard addition to Carbon Dioxide 	[C:1][C:2](=[O])[O][H]>>[C:1][Mg][Br].[O]=[C:2]=[O]	CARBOXYLIC ACIDS	C-C
93	"1,5-sigmatropic hydrogen shifts"	[C:1]1[C:2]=[C:3][C:4]([H])[C:5]=1>>[C:1]1=[C:2][C:3]=[C:4][C:5]([H])1	DIENES	C-C
94	Cope rearrangement	[C:1]=[C:2][C:3][C:4][C:5]=[C:6]>>[C:3]=[C:2][C:1][C:6][C:5]=[C:4]	DIENES	C-C
95	Diketone formation from Ketones and Esters	[C:6][O:5][C:1](=[O:2])[C:3][C:7]=[O:8]>>[C]([H])([H])([H])[C:7]=[O:8].[C:3]([H])[C:1](=[O:2])[O:5][C:6]	DIKETONES	C-C
96	Michael addition	[C:1][C:2](=[O:4])[C:3][C:9][C:8]([H])[C:6](=[O:7])[C:5]>>[C:1][C:2](=[O:4])[C:3]([H]).[C:9]=[C:8][C:6](=[O:7])[C:5]	DIKETONES	C-C
97	Alpha-alkylation of esters	[C:1][C:2]([C:7])[C:3](=[O:4])[O:5][C:6]>>[C:1][C:2]([H])[C:3](=[O:4])[O:5][C:6].[C:7][Cl]	ESTERS	C-C
98	Claisen condensation	[C:1][O:5][C:3](=[O:4])[C:2][C:7](=[O:8])[C:6]>>[C:6][C:7](=[O:8])[O][C]([H])([H])([H]).[C:2]([H])[C:3](=[O:4])[O:5][C:1]	ESTERS	C-C
99	Dieckmann condensation	[C:10][O:9][C:7](=[O:8])[C:1]1[C:2][C:3][C:4][C:5](=[O:6])1>>[C:10][O:9][C:7](=[O:8])[C:1]([H])[C:2][C:3][C:4][C:5](=[O:6])[O][C]([H])([H])([H])	ESTERS	C-C
100	Ketone formation from acid chlorides and organocuprates	[C:1][C:2](=[O:3])[C:4]>>[C:4][Cu-]([C]([H])([H])([H]))[Li+].[C:1][C:2](=[O:3])[Cl]	KETONES	C-C
101	Friedel-Crafts acylation	"[c:1][C,S:2]([H])=[O]>>[c:1][H].[Cl][C,S:2]([H])=[O]"	KETONES	C-C
102	Ketones formation from Conjugated Ketones with Organometallics	[C:1][C:2](=[O:3])[C:6]([H])[C:4][C:5]>>[C:5][C:4][Cu-]([C]([H])([H])[C]([H])([H])([H]))[Li+].[C:1][C:2](=[O:3])[C:6]=[C]([H])([H])	KETONES	C-C
103	Robinson annulation	[C:1]1[C:2]([C:3])=[C:4][C:5](=[O:6])[C:7]([H])[C:8]1>>[C:1]([H])[C:2](=O)[C:3].[C:4]([H])([H])[C:5](=[O:6])[C:7]=[C:8]	KETONES	C-C
104	Ketone formation from Nitriles and Organometallics	[C:1][C:2](=[O])[C:4]>>[C:1][C:2]#[N].[C:4][Mg][Br]	KETONES	C-C
105	Aldol reaction	[#6:1](=[O:2])[#6:3][#6:5]([#6:9])[O:6][H]>>[#6:1](=[O:2])[#6:3]([H]).[#6:5](=[O:6])[#6:9]	KETONE-ALCOHOLS	C-C
106	Nitrile formation from Alkyl Halides	[C:1][C:2][C:4]#[N:5]>>[C:1][C:2][Br].[N:5]#[C:4][Na]	NITRILES	C-C
107	Nitrile-alcohol formation from Ketones or Alcohols	[N:4]#[C:3][C:1][O:2][H]>>[C:1]=[O:2].[N:4]#[C:3][Na]	NITRILE-ALCOHOLS	C-C -->

<!-- Note the ability to perform these kinds of reactions using code like this:
 
    const reactor = new Reactor();
    await reactor.setup("[#6:7][C:1](=[O:2])[O:3][#6:4]>>[#6:7][C:1]([H])([H])[O:2][H].[O:3]([H])[#6:4]")
    reactor.addReactant("c1ccccc1CCCC(=O)OCCCC", 0);
    const results = reactor.runReaction();
-->

<template>
    <PluginComponent v-model="open" :title="title" :intro="intro" :details="details" :menuPath="menuPath"
        :pluginId="pluginId" :userArgDefaults="userArgDefaults" :softwareCredits="softwareCredits"
        :contributorCredits="contributorCredits" :infoPayload="infoPayload" @onUserArgChanged="onUserArgChanged"
        @onMolCountsChanged="onMolCountsChanged" @onPopupDone="onPopupDone" :tags="tags">
    </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import { IContributorCredit, ISoftwareCredit } from "@/Plugins/PluginInterfaces";
import { UserArg, UserArgType, IUserArgSelect, IUserArgMoleculeInputParams } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { FileInfo } from "@/FileSystem/FileInfo";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { dynamicImports } from "@/Core/DynamicImports";
import { Reactor } from "@/Core/Reactor";
import { TreeNode } from "@/TreeNodes/TreeNode/TreeNode";
import { getSetting } from "@/Plugins/Core/Settings/LoadSaveSettings";
import { SelectedType, TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { ITest } from "@/Testing/TestCmd";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { MoleculeInput } from "@/UI/Forms/MoleculeInputParams/MoleculeInput";
import { convertFileInfosOpenBabel } from "@/FileSystem/OpenBabel/OpenBabel";

// Define the reaction database
interface IReaction {
    id: number;
    name: string;
    smirks: string;
    functionalGroup: string;
    transformType: string;
}

const reactions: IReaction[] = [
    {
        id: 1,
        name: "Formation of acetals and ketals from aldehydes/ketones",
        smirks: "[C:7][O:6][C:1][O:3][C:4]>>[C:7][O:6][H].[C:4][O:3][H].[O]=[C:1]",
        functionalGroup: "ACETALS and KETALS",
        transformType: "FGE"
    },
    {
        id: 2,
        name: "Synthesis of acid chlorides From Carboxylic Acids",
        smirks: "[C:3][C:1](=[O:2])[Cl]>>[C:3][C:1](=[O:2])[O][H]",
        functionalGroup: "ACID CHLORIDES",
        transformType: "FGE"
    },
    {
        id: 3,
        name: "Synthesis of alcohols from acid chlorides ",
        smirks: "[#6:7][C:1](=[O:2])[Cl]>>[#6:7][C:1]([H])([H])[O:2][H]",
        functionalGroup: "ALCOHOLS",
        transformType: "FGE"
    },
    {
        id: 4,
        name: "Synthesis of alcohols from anhydrides",
        smirks: "[#6:7][C:1](=[O:2])[O][C](=[O])[C]>>[#6:7][C:1]([H])([H])[O:2][H]",
        functionalGroup: "ALCOHOLS",
        transformType: "FGE"
    },
    {
        id: 5,
        name: "Reduction of esters to alcohols",
        smirks: "[#6:7][C:1](=[O:2])[O:3][#6:4]>>[#6:7][C:1]([H])([H])[O:2][H].[O:3]([H])[#6:4]",
        functionalGroup: "ALCOHOLS",
        transformType: "FGE"
    },
    {
        id: 6,
        name: "Hydration of alkenes",
        smirks: "[H][C:2][C:1][O][H]>>[C:1]=[C:2]",
        functionalGroup: "ALCOHOLS",
        transformType: "FGE"
    },
    {
        id: 7,
        name: "Ether formation from alcohols",
        smirks: "[C:1][O:2][C:3]>>[C:1][O:2][H].[H][O][C:3]",
        functionalGroup: "ETHERS",
        transformType: "FGE"
    },
    {
        id: 8,
        name: "Reduction of aldehydes/ketones",
        smirks: "[H,C:4][C:1]([H])([#6:5])[O:2][H]>>[H,C:4][C:1](=[O:2])[#6:5]",
        functionalGroup: "ALCOHOLS",
        transformType: "FGE"
    },
    {
        id: 9,
        name: "Reduction of conjugated aldehydes/ketones",
        smirks: "[H,C:4][C:1]([H])([O:2][H])[C:5][C:3]>>[H,C:4][C:1](=[O:2])[C:5][C:3]",
        functionalGroup: "ALCOHOLS",
        transformType: "FGE"
    },
    {
        id: 10,
        name: "Halohydrin formation from Alkenes",
        smirks: "[C:1]([O][H])[C:2][Cl]>>[C:1]=[C:2]",
        functionalGroup: "ALCOHOLS-FUNCTIONALIZED",
        transformType: "FGE"
    },
    {
        id: 11,
        name: "Aldehydes From Acetals",
        smirks: "[C:7][O:6][C:1][O:3][C:4]>>[C:7][O:6][H].[C:4][O:3][H].[O]=[C:1]",
        functionalGroup: "ALDEHYDES or KETONES",
        transformType: "FGE"
    },
    {
        id: 12,
        name: "Oxidation of secondary alcohols to ketones",
        smirks: "[C:3][C:1]([C:4])=[O:2]>>[C:3][C:1]([H])([C:4])[O:2][H]",
        functionalGroup: "ALDEHYDES or KETONES",
        transformType: "FGE"
    },
    {
        id: 13,
        name: "Ozonolysis of alkenes",
        smirks: "[C:1]=[C:2]>>[C:1]=[O].[C:2]=[O]",
        functionalGroup: "ALDEHYDES or KETONES",
        transformType: "FGE"
    },
    {
        id: 14,
        name: "Hydration of terminal alkynes",
        smirks: "[C:1]([H])([H])[C:2]([H])[O]>>[C:1]#[C:2]([H])",
        functionalGroup: "ALDEHYDES",
        transformType: "FGE"
    },
    {
        id: 15,
        name: "Oxidation of vicinal diols to aldehydes or ketones",
        smirks: "[O:3]([H])[C:1]([H,C:4])[C:2]([H,C:6])[O:5][H]>>[O:3]=[C:1]([H,C:4]).[C:2]([H,C:6])=[O:5]",
        functionalGroup: "ALDEHYDES or KETONES",
        transformType: "FGE"
    },
    {
        id: 16,
        name: "Reduction of nitriles to aldehydes",
        smirks: "[C:1][C:2](=[O])[H]>>[C:1][C:2]#[N]",
        functionalGroup: "ALDEHYDES or KETONES",
        transformType: "FGE"
    },
    {
        id: 17,
        name: "Reduction of Alkenes to Alkanes",
        smirks: "[C:1]([H])[C:2]([H])>>[C:1]=[C:2]",
        functionalGroup: "ALKANES",
        transformType: "FGE"
    },
    {
        id: 18,
        name: "Reduction of cyclic alkenes",
        smirks: "[C:1]([H])1[C:2]([H])[C:3]([H])[C:4]([H])[C:5]([H])[C:6]([H])1>>[C:1]1[C:2]=[C:3][C:4]=[C:5][C:6]=1",
        functionalGroup: "ALKANES",
        transformType: "FGE"
    },
    {
        id: 19,
        name: "Reduction of alkyl halides",
        smirks: "[C:1]([H])[C:2]>>[Cl][C:1][C:2]",
        functionalGroup: "ALKANES",
        transformType: "FGE"
    },
    {
        id: 20,
        name: "Reduction of Ketones or Aldehydes",
        smirks: "[C:3][C:1]([H])([H])[C:2]>>[C:3][C:1](=[O])[C:2]",
        functionalGroup: "ALKANES",
        transformType: "FGE"
    },
    {
        id: 21,
        name: "Reduction of Alkynes to Alkenes",
        smirks: "[C:1]([H])=[C:2]([H])>>[C:1]#[C:2]",
        functionalGroup: "ALKENES",
        transformType: "FGE"
    },
    {
        id: 22,
        name: "Beta HX elimination",
        smirks: "[C:3][C:2]=[C:1]>>[C:3][C:1][C:2]([H])[Cl]",
        functionalGroup: "ALKENES",
        transformType: "FGE"
    },
    {
        id: 23,
        name: "Alkene formation from Sulfonate Esters (elimination)",
        smirks: "[C:1]=[C:2]>>[C:1]([H])[C:2][O][S](=[O])(=[O])([C]([H])([H])([H]))",
        functionalGroup: "ALKENES",
        transformType: "FGE"
    },
    {
        id: 24,
        name: "Alkene formation from Ammonium Salts (elimination)",
        smirks: "[C:3][C:1]([C:2]([H]))[N]([C])([C])>>[C:3][C:1]=[C:2]",
        functionalGroup: "ALKENES",
        transformType: "FGE"
    },
    {
        id: 25,
        name: "Alkyne formation from Alkenyl Halides (elimination)",
        smirks: "[C:1]#[C:2]>>[Br][C:2]=[C:1][H]",
        functionalGroup: "ALKYNES",
        transformType: "FGE"
    },
    {
        id: 26,
        name: "Synthesis of amides from carboxylic acids",
        smirks: "[N][C:1](=[O:2])[C:7]>>[C:7][C:1](=[O:2])[O][H]",
        functionalGroup: "AMIDES",
        transformType: "FGE"
    },
    {
        id: 27,
        name: "Synthesis of amides from acyl chloride",
        smirks: "[#6:4][N:5][C:1]=[O:2]>>[#6:4][N:5][H].[O:2]=[C:1][Cl]",
        functionalGroup: "AMIDES",
        transformType: "FGE"
    },
    {
        id: 28,
        name: "Synthesis of amides from esters",
        smirks: "[N:3][C:1](=[O:2])[C:7]>>[C:7][C:1](=[O:2])[O][C]([H])([H])[C]([H])([H])([H]).[N:3][H]",
        functionalGroup: "AMIDES",
        transformType: "FGE"
    },
    {
        id: 29,
        name: "Synthesis of amides from anhydrides",
        smirks: "[N:3][C:1](=[O:2])[C:7]>>[C:7][C:1](=[O:2])[O][C](=[O])[C]([H])([H])[C]([H])([H])([H]).[N:3][H]",
        functionalGroup: "AMIDES",
        transformType: "FGE"
    },
    {
        id: 30,
        name: "Catalytic hydration of nitriles to amides",
        smirks: "[C:1][C:2](=[O])[O][H]>>[C:1][C:2]#[N]",
        functionalGroup: "AMIDES",
        transformType: "FGE"
    },
    {
        id: 31,
        name: "Reduction of alkyl azides to amines",
        smirks: "[C:2][N:1]([H])([H])>>[N-]=[N+]=[N:1][C:2]",
        functionalGroup: "AMINES",
        transformType: "FGE"
    },
    {
        id: 32,
        name: "Amines From Imides",
        smirks: "[C:2][N:1]([H])([H])>>[C:2][N:1]([C](=O)[C]([H])([H])[C]([H])([H])([H]))([C](=O)[C]([H])([H])[C]([H])([H])([H]))",
        functionalGroup: "AMINES",
        transformType: "FGE"
    },
    {
        id: 33,
        name: "Amines From Halides",
        smirks: "[C:2][NX3:1]>>[NX3:1][H].[C:2][Cl]",
        functionalGroup: "AMINES",
        transformType: "FGE"
    },
    {
        id: 34,
        name: "Reduction of nitriles to amines",
        smirks: "[C:1][C:2]([H])([H])[N:3]([H])[H]>>[N:3]#[C:2][C:1]",
        functionalGroup: "AMINES",
        transformType: "FGE"
    },
    {
        id: 35,
        name: "Reduction of nitro compounds to amines or anilines",
        smirks: "[#6:1][N:2]([H])([H])>>[#6:1][NX3+:2](=[O])[O-]",
        functionalGroup: "AMINES",
        transformType: "FGE"
    },
    {
        id: 36,
        name: "Synthesis of anhydrides",
        smirks: "[O:6]=[C:5][O:3][C:1]=[O:2]>>[O:2]=[C:1][O:3][H].[O:6]=[C:5][Br]",
        functionalGroup: "ANHYDRIDES",
        transformType: "FGE"
    },
    {
        id: 37,
        name: "Carboxylic acids From Acid chlorides",
        smirks: "[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[Cl]",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 38,
        name: "Carboxylic acids From Anhydrides",
        smirks: "[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[O][C](=[O])[C]([H])([H])[C]([H])([H])([H])",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 39,
        name: "Carboxylic acids From Esters",
        smirks: "[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[O][C]([H])([H])[C]([H])([H])([H])",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 40,
        name: "Carboxylic acids From Amides",
        smirks: "[C:3][C:1](=[O:2])[O][H]>>[C:3][C:1](=[O:2])[N]([H])([H])",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 41,
        name: "Oxidation of primary alcohols to carboxylic acids",
        smirks: "[O:2]=[C:1][O][H]>>[C:1]([H])([H])[O:2][H]",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 42,
        name: "Decarboxylation",
        smirks: "[C:5]([H])[C:1](=[O:2])[O:3][H]>>[H][O:3][C:1](=[O:2])[C:5][C](=[O])[O][H]",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 43,
        name: "Hydrolysis of nitriles to carboxylic acids",
        smirks: "[C:1][C:2](=[O])[O][H]>>[C:1][C:2]#[N]",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 44,
        name: "Birch reduction",
        smirks: "[C:1]([H])1[C:2]=[C:3][C:4]([H])[C:5]=[C:6]1>>[C:1]1=[C:2][C:3]=[C:4][C:5]=[C:6]1",
        functionalGroup: "DIENES",
        transformType: "FGE"
    },
    {
        id: 45,
        name: "Hydroxylation of alkenes",
        smirks: "[H][O][C:1][C:2][O][H]>>[C:1]=[C:2]",
        functionalGroup: "DIOLS",
        transformType: "FGE"
    },
    {
        id: 46,
        name: "Cleavage of epoxides",
        smirks: "[O][C:1][C:2][O]>>[C:1]1O[C:2]1",
        functionalGroup: "DIOLS",
        transformType: "FGE"
    },
    {
        id: 47,
        name: "Enamine formation",
        smirks: "[N:1][C:2]=[C:3]>>[N:1][H].[O]=[C:2][C:3][H]",
        functionalGroup: "ENAMINES",
        transformType: "FGE"
    },
    {
        id: 48,
        name: "Oxidation of alkenes with peracids",
        smirks: "[C:2]([H])1[C:1][O:3]1>>[C:1]=[C:2][C]([H])([H])([H]).[C]([H])([H])([H])[C](=[O])[O][O:3][H]",
        functionalGroup: "EPOXIDES",
        transformType: "FGE"
    },
    {
        id: 49,
        name: "Epoxide formation from Halohydrins",
        smirks: "[C:2]1[C:1][O:3]1>>[C:1]([O:3][H])[C:2][Cl]",
        functionalGroup: "EPOXIDES",
        transformType: "FGE"
    },
    {
        id: 50,
        name: "Fischer esterification",
        smirks: "[O:2]=[C:1][O:6][C:8]>>[H][O:6][C:8].[O:2]=[C:1][O][H]",
        functionalGroup: "ESTERS",
        transformType: "FGE"
    },
    {
        id: 51,
        name: "Acylation with acid chlorides",
        smirks: "[O:2]=[C:1][O:6][C:8]>>[H][O:6][C:8].[O:2]=[C:1][Cl]",
        functionalGroup: "ESTERS",
        transformType: "FGE"
    },
    {
        id: 52,
        name: "Acylation with anhydrides",
        smirks: "[O:2]=[C:1][O:6][C:8]>>[H][O:6][C:8].[O:2]=[C:1][O][C](=[O])[C]([H])([H])([H])",
        functionalGroup: "ESTERS",
        transformType: "FGE"
    },
    {
        id: 53,
        name: "Esterification of alcohols",
        smirks: "[O:2]=[C:1][O:6][#6:8]>>[H][O:6][#6:8].[O:2]=[C:1][O][C]([H])([H])([H])",
        functionalGroup: "ESTERS",
        transformType: "FGE"
    },
    {
        id: 54,
        name: "Oxidation of ketones I",
        smirks: "[C:1][C:2](=[O])[O][C:3]>>[C:1][C:2](=[O])[C:3]",
        functionalGroup: "ESTERS",
        transformType: "FGE"
    },
    {
        id: 55,
        name: "Oxidation of ketones II",
        smirks: "[C:3][C:2](=[O])[O][C:1]>>[C:1][C:2](=[O])[C:3]",
        functionalGroup: "ESTERS",
        transformType: "FGE"
    },
    {
        id: 56,
        name: "Williamson ether synthesis",
        smirks: "[C:1][O:2][C:4]>>[C:1][O:2][H].[C:4][Cl]",
        functionalGroup: "ETHERS",
        transformType: "FGE"
    },
    {
        id: 57,
        name: "Halogenation of alcohols with hydrogen halides",
        smirks: "[C:1][Cl:2]>>[C:1][O][H].[Cl:2][H]",
        functionalGroup: "HALIDES (ALKYL)",
        transformType: "FGE"
    },
    {
        id: 58,
        name: "Halogenation",
        smirks: "[#6:1][Cl]>>[#6:1]([H])",
        functionalGroup: "HALIDES (ALKYL)",
        transformType: "FGE"
    },
    {
        id: 59,
        name: "Hydrogen halide addition to alkenes",
        smirks: "[Cl][C:1][C:3]([H])>>[C:1]=[C:3]",
        functionalGroup: "HALIDES (ALKYL)",
        transformType: "FGE"
    },
    {
        id: 60,
        name: "Halogen addition to alkenes",
        smirks: "[Cl][C:1][C:3]([Cl])>>[C:1]=[C:3]",
        functionalGroup: "HALIDES (ALKYL)",
        transformType: "FGE"
    },
    {
        id: 61,
        name: "Hydrogen halide addition to alkynes",
        smirks: "[Cl:3][C:2]=[C:1][H:4]>>[C:1]#[C:2].[Cl:3][H:4]",
        functionalGroup: "HALIDES (ALKENYL) ",
        transformType: "FGE"
    },
    {
        id: 62,
        name: "Condensation of primary amines and oxocompounds",
        smirks: "[C:2]=[N][H]>>[O]=[C:2]",
        functionalGroup: "IMINES",
        transformType: "FGE"
    },
    {
        id: 63,
        name: "Hydartion of alkynes",
        smirks: "[C:1]([H])([H])[C:2](=[O])[C:3]([H])([H])>>[C:1]([H])([H])[C:2]#[C:3]",
        functionalGroup: "KETONES or ALDEHYDES",
        transformType: "FGE"
    },
    {
        id: 64,
        name: "Oxidation of vicinal diols",
        smirks: "[O:3]([H])[C:1]([C:4])[C:2]([C:7])([C:6])[O:5][H]>>[O:3]=[C:1]([C:4]).[C:2]([C:7])([C:6])=[O:5]",
        functionalGroup: "KETONES or ALDEHYDES",
        transformType: "FGE"
    },
    {
        id: 65,
        name: "Decarboxylation of ?-ketoacid",
        smirks: "[C:1]([H])[C:2](=[O:3])>>[C:1]([C](=[O])[O][H])[C:2](=[O:3])",
        functionalGroup: "KETONES or ALDEHYDES",
        transformType: "FGE"
    },
    {
        id: 66,
        name: "Dehydration of amides to nitriles",
        smirks: "[C:1][C:2]#[N:3]>>[C:1][C:2](=[O])[N:3]([H])[H]",
        functionalGroup: "NITRILES",
        transformType: "FGE"
    },
    {
        id: 67,
        name: "Nitration of Aromatic Hydrocarbons",
        smirks: "[c;H0:1][N+]([O-])=[O]>>[c:1][H]",
        functionalGroup: "NITRO COMPOUNDS",
        transformType: "FGE"
    },
    {
        id: 68,
        name: "Alkyl Lithium formation from alkyl halides",
        smirks: "[C:1][Li]>>[C:1][Cl]",
        functionalGroup: "ORGANOMETALLICS",
        transformType: "FGE"
    },
    {
        id: 69,
        name: "Aryl Halides to Phenols",
        smirks: "[c:1][O][H]>>[c:1][Cl]",
        functionalGroup: "PHENOLS",
        transformType: "FGE"
    },
    {
        id: 70,
        name: "Primary Anilines to Phenols",
        smirks: "[c:1][O][H]>>[c:1][N]([H])([H])",
        functionalGroup: "PHENOLS",
        transformType: "FGE"
    },
    {
        id: 71,
        name: "Sulfonation of aromatic hydrocarbons",
        smirks: "[c:1][S](=[O])(=[O])[O][H]>>[c:1]([H])",
        functionalGroup: "SULFONIC ACIDS",
        transformType: "FGE"
    },
    {
        id: 72,
        name: "Grignard Alcohol From Acid Chloride and Organometallics",
        smirks: "[C:1][C:4]([C:2])([C:6])[O:5][H]>>[C:1][Mg][Br].[C:2][Mg][Br].[C:6][C:4](=[O:5])[Cl]",
        functionalGroup: "ALCOHOLS",
        transformType: "C-C"
    },
    {
        id: 73,
        name: "Grignard Alcohol From Anhydride and Organometallics",
        smirks: "[C:1][C:4]([C:2])([C:6])[O:5][H]>>[C:1][Mg][Br].[C:2][Mg][Br].[C:6][C:4](=[O:5])[O][C](=[O])[C]([H])([H])[C]([H])([H])([H])",
        functionalGroup: "ALCOHOLS",
        transformType: "C-C"
    },
    {
        id: 74,
        name: "Grignard Alcohol From Esters and Organometallics",
        smirks: "[C:1][C:4]([C:2])([C:6])[O:5][H]>>[C:1][Mg][Br].[C:2][Mg][Br].[C:6][C:4](=[O:5])[O][C]([H])([H])[C]([H])([H])([H])",
        functionalGroup: "ALCOHOLS",
        transformType: "C-C"
    },
    {
        id: 75,
        name: "Grignard Alcohol From Epoxides",
        smirks: "[C:4][C:2]([H])[C:1][O:3][H]>>[C:2]([H])1[C:1][O:3]1.[C:4][Mg][Br]",
        functionalGroup: "ALCOHOLS",
        transformType: "C-C"
    },
    {
        id: 76,
        name: "Grignard reaction to carbonyl compounds",
        smirks: "[C:3][C:1][O:2][H]>>[C:1]=[O:2].[Cl][Mg][C:3]",
        functionalGroup: "ALCOHOLS",
        transformType: "C-C"
    },
    {
        id: 77,
        name: "?-hydroxyester formation",
        smirks: "[O:6]([H])[C:5]([C:4])([H,C:7])[C:2][C:1](=[O:3])[O:8][C:9]>>[C:4][C:5]([H,C:7])=[O:6].[C:2]([H])[C:1](=[O:3])[O:8][C:9]",
        functionalGroup: "ALCOHOLS-ESTERS",
        transformType: "C-C"
    },
    {
        id: 78,
        name: "Alkylation of aldehydes/ketones",
        smirks: "[C:1][C:2][C:3](=[O:5])[C:4]>>[C:1][I].[C:2]([H])[C:3](=[O:5])[C:4]",
        functionalGroup: "ALDEHYDES and KETONES",
        transformType: "C-C"
    },
    {
        id: 79,
        name: "Aromatic aldehydes fom Organometallics ",
        smirks: "[c:1][C](=[O])[H]>>[c:1][Mg][Br]",
        functionalGroup: "ALDEHYDES and KETONES",
        transformType: "C-C"
    },
    {
        id: 80,
        name: "Claisen rearrangement",
        smirks: "[C:1](=[O:2])[C:6][C:5][C:4]=[C:3]>>[C:6]=[C:1][O:2][C:3][C:4]=[C:5]",
        functionalGroup: "ALDEHYDE-ALKENES",
        transformType: "C-C"
    },
    {
        id: 81,
        name: "[2+2]-photocycloaddition",
        smirks: "[C:1]1[C:2][C:3][C:4]1[C:5]>>[C:1]=[C:2].[C:3]=[C:4][C:5]",
        functionalGroup: "ALKANES",
        transformType: "C-C"
    },
    {
        id: 82,
        name: "[2+2]-photocycloaddition",
        smirks: "[C:1]1[C:2][C:4]([C;R0:5])[C:3]1>>[C:1]=[C:2].[C:3]=[C:4][C:5]",
        functionalGroup: "ALKANES",
        transformType: "C-C"
    },
    {
        id: 83,
        name: "Negishi coupling",
        smirks: "[C:1][C:2]>>[C:1][Zn][Cl].[C:2][Cl]",
        functionalGroup: "ALKANES",
        transformType: "C-C"
    },
    {
        id: 84,
        name: "Heck reaction",
        smirks: "[C:1]=[C:2][#6:3]>>[C:1]=[C:2]([H]).[#6:3][Cl]",
        functionalGroup: "ALKENES",
        transformType: "C-C"
    },
    {
        id: 85,
        name: "Diels-Alder cycloaddition",
        smirks: "[C:1]1[C:2]=[C:3][C:4][C:5][C:6]1>>[C:1]=[C:2][C:3]=[C:4].[C:5]=[C:6]",
        functionalGroup: "ALKENES",
        transformType: "C-C"
    },
    {
        id: 86,
        name: "Ring Closing Metathesis",
        smirks: "[C:1]=[C:2]CCCC[C:3]=[C:4]>>[C:2]1=[C:3]C([H])([H])C([H])([H])C([H])([H])C([H])([H])1.[C:1]=[C:4]",
        functionalGroup: "ALKENES",
        transformType: "C-C"
    },
    {
        id: 87,
        name: "Wittig reaction",
        smirks: "[C:1]=[C:2]>>[C:1]=[O].[C:2]([H])[Cl]",
        functionalGroup: "ALKENES",
        transformType: "C-C"
    },
    {
        id: 88,
        name: "Sonogashira coupling",
        smirks: "[C:1]=[#6:2][C:3]#[#6:4]([H])>>[C:1]=[#6:2][Cl].[#6:4]([H])#[C:3]([H])",
        functionalGroup: "ALKYNES",
        transformType: "C-C"
    },
    {
        id: 89,
        name: "Alkyne-alcohol formation",
        smirks: "[C:1]#[C:2][C:4]([C:3])([O:6][H])[C:5]>>[C:1]#[C:2][Na].[C:3][C:4](=[O:6])[C:5]",
        functionalGroup: "ALKYNE-ALCOHOLS",
        transformType: "C-C"
    },
    {
        id: 90,
        name: "Friedel-Crafts alkylation",
        smirks: "[c:1][C:3]>>[c:1].[Cl][C:3]",
        functionalGroup: "ARENES",
        transformType: "C-C"
    },
    {
        id: 91,
        name: "Suzuki coupling",
        smirks: "[c;H0:1][c;H0:2]>>[c;H1:1][Cl].[c;H1:2][B]([O][H])[O][H]",
        functionalGroup: "BIARYLS",
        transformType: "C-C"
    },
    {
        id: 92,
        name: "Grignard addition to Carbon Dioxide ",
        smirks: "[C:1][C:2](=[O])[O][H]>>[C:1][Mg][Br].[O]=[C:2]=[O]",
        functionalGroup: "CARBOXYLIC ACIDS",
        transformType: "C-C"
    },
    {
        id: 93,
        name: "1, 5 - sigmatropic hydrogen shifts",
        smirks: "[C:1]1[C:2]=[C:3][C:4]([H])[C:5]=1>>[C:1]1=[C:2][C:3]=[C:4][C:5]([H])1",
        functionalGroup: "DIENES",
        transformType: "C-C"
    },
    {
        id: 94,
        name: "Cope rearrangement",
        smirks: "[C:1]=[C:2][C:3][C:4][C:5]=[C:6]>>[C:3]=[C:2][C:1][C:6][C:5]=[C:4]",
        functionalGroup: "DIENES",
        transformType: "C-C"
    },
    {
        id: 95,
        name: "Diketone formation from Ketones and Esters",
        smirks: "[C:6][O:5][C:1](=[O:2])[C:3][C:7]=[O:8]>>[C]([H])([H])([H])[C:7]=[O:8].[C:3]([H])[C:1](=[O:2])[O:5][C:6]",
        functionalGroup: "DIKETONES",
        transformType: "C-C"
    },
    {
        id: 96,
        name: "Michael addition",
        smirks: "[C:1][C:2](=[O:4])[C:3][C:9][C:8]([H])[C:6](=[O:7])[C:5]>>[C:1][C:2](=[O:4])[C:3]([H]).[C:9]=[C:8][C:6](=[O:7])[C:5]",
        functionalGroup: "DIKETONES",
        transformType: "C-C"
    },
    {
        id: 97,
        name: "Alpha-alkylation of esters",
        smirks: "[C:1][C:2]([C:7])[C:3](=[O:4])[O:5][C:6]>>[C:1][C:2]([H])[C:3](=[O:4])[O:5][C:6].[C:7][Cl]",
        functionalGroup: "ESTERS",
        transformType: "C-C"
    },
    {
        id: 98,
        name: "Claisen condensation",
        smirks: "[C:1][O:5][C:3](=[O:4])[C:2][C:7](=[O:8])[C:6]>>[C:6][C:7](=[O:8])[O][C]([H])([H])([H]).[C:2]([H])[C:3](=[O:4])[O:5][C:1]",
        functionalGroup: "ESTERS",
        transformType: "C-C"
    },
    {
        id: 99,
        name: "Dieckmann condensation",
        smirks: "[C:10][O:9][C:7](=[O:8])[C:1]1[C:2][C:3][C:4][C:5](=[O:6])1>>[C:10][O:9][C:7](=[O:8])[C:1]([H])[C:2][C:3][C:4][C:5](=[O:6])[O][C]([H])([H])([H])",
        functionalGroup: "ESTERS",
        transformType: "C-C"
    },
    {
        id: 100,
        name: "Ketone formation from acid chlorides and organocuprates",
        smirks: "[C:1][C:2](=[O:3])[C:4]>>[C:4][Cu-]([C]([H])([H])([H]))[Li+].[C:1][C:2](=[O:3])[Cl]",
        functionalGroup: "KETONES",
        transformType: "C-C"
    },
    {
        id: 101,
        name: "Friedel-Crafts acylation",
        smirks: "[c:1][C,S:2]([H])=[O]>>[c:1][H].[Cl][C,S:2]([H])=[O]",
        functionalGroup: "KETONES",
        transformType: "C-C"
    },
    {
        id: 102,
        name: "Ketones formation from Conjugated Ketones with Organometallics",
        smirks: "[C:1][C:2](=[O:3])[C:6]([H])[C:4][C:5]>>[C:5][C:4][Cu-]([C]([H])([H])[C]([H])([H])([H]))[Li+].[C:1][C:2](=[O:3])[C:6]=[C]([H])([H])",
        functionalGroup: "KETONES",
        transformType: "C-C"
    },
    {
        id: 103,
        name: "Robinson annulation",
        smirks: "[C:1]1[C:2]([C:3])=[C:4][C:5](=[O:6])[C:7]([H])[C:8]1>>[C:1]([H])[C:2](=O)[C:3].[C:4]([H])([H])[C:5](=[O:6])[C:7]=[C:8]",
        functionalGroup: "KETONES",
        transformType: "C-C"
    },
    {
        id: 104,
        name: "Ketone formation from Nitriles and Organometallics",
        smirks: "[C:1][C:2](=[O])[C:4]>>[C:1][C:2]#[N].[C:4][Mg][Br]",
        functionalGroup: "KETONES",
        transformType: "C-C"
    },
    {
        id: 105,
        name: "Aldol reaction",
        smirks: "[#6:1](=[O:2])[#6:3][#6:5]([#6:9])[O:6][H]>>[#6:1](=[O:2])[#6:3]([H]).[#6:5](=[O:6])[#6:9]",
        functionalGroup: "KETONE-ALCOHOLS",
        transformType: "C-C"
    },
    {
        id: 106,
        name: "Nitrile formation from Alkyl Halides",
        smirks: "[C:1][C:2][C:4]#[N:5]>>[C:1][C:2][Br].[N:5]#[C:4][Na]",
        functionalGroup: "NITRILES",
        transformType: "C-C"
    },
    {
        id: 107,
        name: "Nitrile-alcohol formation from Ketones or Alcohols",
        smirks: "[N:4]#[C:3][C:1][O:2][H]>>[C:1]=[O:2].[N:4]#[C:3][Na]",
        functionalGroup: "NITRILE-ALCOHOLS",
        transformType: "C-C -->"
    },

];

@Options({
    components: {
        PluginComponent,
    },
})
export default class SyntheticDecomposePlugin extends PluginParentClass {
    menuPath = "Compounds/Transform/[3] Synthetic Decomposition...";
    title = "Synthetic Decomposition";
    pluginId = "syntheticdecompose";
    intro = "Decompose compounds into fragments using retrosynthetic reactions.";
    details = `Performs retrosynthetic analysis by applying common chemical transformations
        to break down molecules into simpler fragments. Uses the Indigo cheminformatics
        toolkit to process SMIRKS reaction patterns.`;

    softwareCredits: ISoftwareCredit[] = [dynamicImports.indigo.credit];
    contributorCredits: IContributorCredit[] = [];
    tags = [Tag.Modeling];  // , Tag.Chemistry]; // TODO: right tag?

    userArgDefaults: UserArg[] = [
        {
            id: "makemolinputparams",
            val: new MoleculeInput({
                compoundFormat: "mol2",
                considerProteins: false,
                batchSize: null,
            }),
        } as IUserArgMoleculeInputParams,
        {
            id: "reactionType",
            label: "Reaction type",
            type: UserArgType.Select,
            val: "all",
            options: [
                { val: "all", description: "All reactions" },
                { val: "FGE", description: "Functional group exchange (FGE)" },
                { val: "C-C", description: "Carbon-carbon bond formation (C-C)" }
            ],
            description: "Type of retrosynthetic transformations to apply.",
        } as IUserArgSelect,
    ];

    async submitJobToServer(): Promise<void> {
        const compounds: FileInfo[] = this.getUserArg("makemolinputparams");

        // Filter reactions based on selected type
        const selectedType = this.userArgs.find(arg => arg.id === "reactionType")?.val;
        const applicableReactions = reactions.filter(r =>
            selectedType === "all" || r.transformType === selectedType
        );

        const smiTexts = (await convertFileInfosOpenBabel(
            compounds,
            "can"
        )) as string[];

        const productPromises: Promise<void | TreeNode>[] = [];

        // Process each reaction with all compounds
        for (const reaction of applicableReactions) {
            // try {
            const reactor = new Reactor();

            try {
                await reactor.setup(reaction.smirks);
                console.log(reaction.smirks);
            } catch (error) {
                console.warn(`Reaction ${reaction.id} failed:`, error);
                debugger
            }

            // Add all compounds as reactants
            for (const smiles of smiTexts) {
                reactor.addReactant(smiles, 0);
            }

            // Run reaction on all reactants at once
            const results = reactor.runReaction();

            // Create new molecules for each product
            for (const result of results) {
                for (const [idx, productSmiles] of result.products.entries()) {
                    const fileInfo = new FileInfo({
                        name: `${reaction.id}_product${idx + 1}.can`,  // ${result.reactants[0]}_${reaction.id}_
                        contents: productSmiles,
                        auxData: `Product ${idx + 1} from ${reaction.name}`
                    });

                    const treeNodePromise = TreeNode.loadFromFileInfo({
                        fileInfo,
                        tag: this.pluginId
                    });
                    productPromises.push(treeNodePromise);
                }
            }
            // } catch (error) {
            // console.warn(`Reaction ${reaction.id} failed:`, error);
            // }
        }

        // debugger
        // const ttt = await Promise.all(productPromises);

        // Wait for all products to be created
        const treeNodes = (await Promise.all(productPromises)).filter(node => node !== undefined) as TreeNode[];

        const initialCompoundsVisible = await getSetting("initialCompoundsVisible");

        // Configure the tree nodes
        treeNodes.forEach((node, i) => {
            if (node.nodes) {
                node = node.nodes.terminals.get(0);
            }
            node.visible = i < initialCompoundsVisible;
            node.selected = SelectedType.False;
            node.focused = false;
            node.viewerDirty = true;
            node.type = TreeNodeType.Compound;
        });

        // Create root node and add to tree
        const rootNode = TreeNode.loadHierarchicallyFromTreeNodes(treeNodes);
        rootNode.title = "Products:decomposed";
        rootNode.addToMainTree(this.pluginId);
    }

    async runJobInBrowser(): Promise<void> {
        return this.submitJobToServer();
    }

    async getTests(): Promise<ITest[]> {
        return [];
    }
}
</script>
