
import React from 'react';
import { 
  Activity, 
  Hand, 
  Utensils, 
  MessageSquare, 
  Speech, 
  Brain, 
  Users 
} from 'lucide-react';

export const DOMAINS = [
  { id: 'grossMotor', label: 'Gross Motor', icon: <Activity className="w-5 h-5" />, color: 'text-blue-600', max: 13 },
  { id: 'fineMotor', label: 'Fine Motor', icon: <Hand className="w-5 h-5" />, color: 'text-emerald-600', max: 11 },
  { id: 'selfHelp', label: 'Self-Help', icon: <Utensils className="w-5 h-5" />, color: 'text-orange-600', max: 27 },
  { id: 'receptiveLanguage', label: 'Receptive Language', icon: <MessageSquare className="w-5 h-5" />, color: 'text-purple-600', max: 5 },
  { id: 'expressiveLanguage', label: 'Expressive Language', icon: <Speech className="w-5 h-5" />, color: 'text-pink-600', max: 8 },
  { id: 'cognitive', label: 'Cognitive', icon: <Brain className="w-5 h-5" />, color: 'text-indigo-600', max: 21 },
  { id: 'socioEmotional', label: 'Socio-Emotional', icon: <Users className="w-5 h-5" />, color: 'text-cyan-600', max: 24 },
];

export const ECCD_TASKS: Record<string, string[]> = {
  grossMotor: [
    "Nakaakyat ng silya o matataas na mga gamit gaya ng kama na walang tumutulong.",
    "Nakalalakad nang pabalik.",
    "Nakatatakbo nang hindi nadadapa.",
    "Nakabababa ng hagdan gamit ang parehong paa sa bawat baitang habang nakahawak sa gabay ng hagdan ang isang kamay.",
    "Nakaaakyat ng hagdan gamit ang parehong paa sa bawat baitang habang nakahawak sa gabay ng hagdan.",
    "Nakaaakyat ng hagdan na salitan ang mga paa na hindi humahawak sa gabay ng hagdan.",
    "Nakabababa ng hagdan na salitan ang mga paa na hindi humahawak sa gabay ng hagdan.",
    "Naigagalaw ang mga parte ng katawan kapag inutusan.",
    "Nakatatalon.",
    "Naihahagis ang bola sa paitaas na direksyon.",
    "Nakalulundag ng 1-3 beses gamit ang mas gustong paa.",
    "Tumatalon at umikot.",
    "Nakasasayaw/nakasusunod sa mga hakbang ng sayaw, grupong gawain ayon sa kilos at galaw."
  ],
  fineMotor: [
    "Nagagamit ang limang daliri sa pagkuha ng pagkain,bagay mula sa patag na lugar.",
    "Nakukuha ang bagay gamit ang hinlalaki at hintuturo.",
    "Nagpapakita ng higit na pagkagusto sa paggamit ng particular na kamay.",
    "Inilalagay / inaalis ang maliliit na bagay sa lalagyan.",
    "Nahahawakan ang krayola gamit nang nakasara ang palad.",
    "Natatanggal ang takip ng bote/lalagyan, inaalis ang balot ng pagkain.",
    "Nakaguguhit nang mabilis na di maintindihang anyo.",
    "Nakaguguhit nang bilog na hugis.",
    "Nakaguguhit nang patayo at pahalang na guhit.",
    "Nakaguguhit ng larawan ng tao (ulo, mata, katawan, braso, kamay/daliri).",
    "Nakaguguhit ng bahay gamit ang iba't-ibang uri ng hugis."
  ],
  selfHelp: [
    "Kumakain nang hindi nagsusubo.",
    "Kumakain gamit ang kutsara at tinidor.",
    "Naghahanda ng pagkain ng walang tulong.",
    "Naghuhugas at nagpupunas ng kamay at mukha ng walang tulong.",
    "Naliligo nang walang tulong.",
    "Nagsisipilyo nang walang tulong.",
    "Gumagamit ang kubeta nang mag-isa.",
    "Nakapagbibihis at nakapaghuhubad nang walang tulong.",
    "Nagbubutones at nagtatali ng sintas.",
    "Inaayos ang mga gamit sa tamang lalagyan.",
    "Nagpapakita ng kaayusan sa sarili sa lahat ng pagkakataon.",
    "Ipinagpapaalam ang sarili bago umalis.",
    "Sumusunod sa mga tagubilin sa pag-iingat sa sarili.",
    "Nakatutulong sa mga gawaing bahay (hal. pagpupunas ng mesa, pagdidilig ng halaman atbp.)",
    "Isinasagawa ang mga gawain hanggang sa matapos ito.",
    "Nagsisimula ng sariling gawain.",
    "Naghahanap ng solusyon sa mga suliranin.",
    "Nagtatanong para sa karagdagang kaalaman.",
    "Nagsasabi ng totoong nararamadaman.",
    "Iginagalang ang gamit ng iba.",
    "Tumutulong sa kapwa.",
    "Nagbabahagi ng gamit sa iba.",
    "Humihingi ng paumanhin.",
    "Nagpapakita ng paggalang sa nakatatanda at sa may awtoridad.",
    "Sumusunod sa mga alituntunin ng paaralan.",
    "Pinahahalagahan ang paggawa ng mabuti.",
    "Ipinagmamalaki ang sarili."
  ],
  receptiveLanguage: [
    "Nakasusunod sa mga utos na may 2-3 hakbang.",
    "Nakasagot sa mga tanong na literal.",
    "Nakasagot sa mga tanong na ipinahihiwatig.",
    "Naaalala ang mga detalye sa kwentong napakinggan.",
    "Nakapagbibigay ng sanhi at bunga ng mga pangyayari mula sa kwentong napakinggan."
  ],
  expressiveLanguage: [
    "Nakagagamit ng 5-20 nakikilalang salita (maliban sa mama at papa o kahlintulad nito)",
    "Nakagagamit ng panghalip (hal. Ako, akin)",
    "Nakagagamit ng 2-3 kombinasyon ng pandiwa-pantangi (verb-noun combinations) (hal.hingi gatas)",
    "Napangangalanan ang mga bagay na nakikita sa larawan",
    "Nakapagsasalita ng 2-3 tamang pangungusap",
    "Nakapagtatanong ng \"ano...\"",
    "Nakapagtatanong ng \"sino\" at \"bakit\"",
    "Nakapagkukwento ng katatapos na karanasan (kapag tinanong/diniktahan) na naaayon sa pagkakasunod-sunod ng pangyayari gamit ang mga salitang tumutukoy sa pangnakaraan."
  ],
  cognitive: [
    "Tinitingnan ang direksyon ng nahuhulog na bagay",
    "Hinahanap ang bahagyang nakatagong bagay",
    "Hinahanap ang ganap na nakatagong bagay",
    "Nakakakuha ng laruang hindi maabot sa pamamagitan ng paggamit ng ibang bagay para maabot ito",
    "Nauunawaan ang konsepto ng sukat (hal. malaki/maliit)",
    "Nauunawaan ang konsepto ng bilang (isa, dalawa, tatlo)",
    "Nauunawaan ang mga konsepto ng ugnayan",
    "Napapangalanan ang 4-6 na kulay",
    "Napapangalanan ang 3-4 na hugis",
    "Napagtutugma ang mga hugis",
    "Kinokopya ang mga hugis",
    "Nakabubuo ng simpleng puzzle",
    "Nagpapakita ng kamalayan sa mga pang-araw-araw na gawain at mga espesyal na okasyon",
    "Nakapaghihintay ng kanyang pagkakataon",
    "Nagtatanong ng \"bakit\"",
    "Nasasagot ang mga tanong na nangangailangan ng pangangatwiran",
    "Nasasabi kung ano ang susunod na mangyayari sa isang pamilyar na kwento",
    "Nauulit ang mga linya mula sa mga pamilyar na kwento/tula",
    "Gumaganap ng mga simpleng laro na nagpapanggap (pretend-play) na may mga tema na pamilyar sa kanya (hal. pagluluto, pag-aalaga ng sanggol, atbp.)",
    "Ibinibigay ang unang pangalan at apelyido",
    "Ibinibigay ang kanyang edad/gulang."
  ],
  socioEmotional: [
    "Nasisiyahan sa pagkapanalo sa mga laro at kapag natatapos ang gawain.",
    "Nagpapakita ng paggalang sa ibang tao. (hal. sa pamamagitan ng paggamit ng “po” at “opo”)",
    "Nakapaghihintay sa kanyang pagkakataon.",
    "Madaling makipaglaro sa ibang bata.",
    "Naglalaro ng \"bulaga\".",
    "Tumatawa/ngumingiti sa ibang tao.",
    "Nagpapakita ng pagmamahal sa mga pamilyar na tao.",
    "Ginagaya ang kilos ng matatanda.",
    "Niyayakap ang mga laruan.",
    "Tumatawa/ngumingiti sa ibang tao.",
    "Nagpapakita ng pagmamahal sa mga pamilyar na tao.",
    "Ginagaya ang kilos ng matatanda.",
    "Niyayakap ang mga laruan.",
    "Tumutulong sa mga gawaing-bahay.",
    "Alam na iba siya sa ibang tao.",
    "Nagpapakita ng interes sa kanyang kapaligiran pero nahihiya sa mga hindi kilalang tao.",
    "Alam ang pagkakaiba ng babae, lalaki.",
    "Ipinagmamalaki ang kanyang mga nagawa.",
    "Madaling humiwalay sa ina/tagapag-alaga.",
    "Iginagalang ang gamit ng iba.",
    "Nagbabahagi ng laruan sa iba.",
    "Sumusunod sa mga simpleng alituntunin.",
    "Pinangangalagaan ang mga pasilidad sa paaralan/pamayanan.",
    "Nakikipagtulungan sa mga pangkatang gawain.",
    "Nasisimula ng usapan.",
    "Nakikiramay sa damdamin ng iba.",
    "Nagpapakita ng kasiyahan sa pakikipag-ugnayan sa kapwa sa pamamagitan ng pagbati, pagkukuwento, pakikinig, at pagtatanong.",
    "Ipinahahayag ang galit sa pamamagitan ng pagsasalita sa halip na saktan ang iba."
  ]
};

export const LD_MAPPING: Record<string, string[]> = {
  "LD 1": ["Cabagan", "Delfin Albano", "Divilacan-Maconacon Cluster", "San Pablo", "Sta. Maria", "Sto. Tomas", "Tumauini North", "Tumauini South"],
  "LD 2": ["Benito Soliven North", "Benito Soliven South", "Gamu", "Naguilian", "Palanan Cluster", "Reina Mercedes", "San Mariano I", "San Mariano II"],
  "LD 3": ["Alicia East", "Alicia North", "Alicia South", "Angadanan East", "Angadanan West", "Cabatuan East", "Cabatuan West", "Ramon", "San Mateo North", "San Mateo South"],
  "LD 4": ["Cordon North", "Cordon South", "Dinapigue Cluster", "Jones East", "Jones West", "San Agustin"],
  "LD 5": ["Aurora", "Burgos", "Luna", "Mallig", "Quezon", "Quirino", "Roxas East", "Roxas West", "San Manuel"],
  "LD 6": ["Echague East", "Echague South", "Echague West", "San Guillermo", "San Isidro"]
};

export const MOCK_SCHOOLS = [
  { id: 'sch-1', name: 'Central Elementary School', district: 'District I', legislativeDistrict: '1st District' },
  { id: 'sch-2', name: 'West Valley Primary', district: 'District II', legislativeDistrict: '1st District' },
  { id: 'sch-3', name: 'North Highlands Elementary', district: 'District III', legislativeDistrict: '2nd District' },
];

export const PERIODS = ['FIRST ASSESSMENT', 'MID-ASSESSMENT', 'THIRD ASSESSMENT'] as const;
