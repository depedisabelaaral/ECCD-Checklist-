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

// Original ECCD Constants
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
    "Nakakakain nang mag-isa tulad ng biskwit at tinapay (finger food).",
    "Nakakakain nang mag-isa ng kanin at ulam gamit ang daliri ngunit may natatapong pagkain.",
    "Nakakakain nang mag-isa gamit ang kutsara ngunit may natatapong pagkain.",
    "Nakakakain nang mag-isa ng kanin at ulam gamit ang mga daliri na walang natatapong pagkain.",
    "Nakakakain nang mag-isa gamit ang kutsara ngunit walang natatapong pagkain.",
    "Nakakakain nang hindi na kailangang subuan pa.",
    "Tumutulong sa paghawak ng baso sa pag – inom.",
    "Nakaiinom sa baso ngunit may natatapon.",
    "Nakaiinom sa baso nang walang tumutulong.",
    "Nakakakuha nang inumin mag isa.",
    "Nakapagsasalin ng tubig (o anumang likido) mula sa pitsel na walang natatapon.",
    "Nakapaghahanda ng sariling pagkain / meryenda.",
    "Nakapaghahanda ng pagkain ng nakababatang kapatid/kapamilya kung walang kasamang matanda.",
    "Nakikipagtulungan kung binibihisan (hal. Itinataas ang mga kamay at paa).",
    "Nakapaghuhubad ng shorts na may garter.",
    "Nakapaghuhubad ang sando.",
    "Nakapagbibihis mag-isa maliban sa pagbubutones at pagtatali ng laso ng sapatos.",
    "Nakapagbibihis mag-isa at nakapagbubutones at nakapagtatali ng laso ng sapatos.",
    "Naipaalam sa tagapag-alaga ang pagkatapos na maka-ihi o dumumi sa kanyang salawal.",
    "Naipaalam sa tagapag-alaga ang pangangailangang umihi o dumumi upang makapunta sa tamang lugar (hal. banyo, CR).",
    "Nakapupunta sa tamang lugar upang umihi o dumumi (hal. banyo, CR) ngunit paminsan-minsan nakaihi o nakadumi na sa salawal.",
    "Nakapupunta sa tamang lugar upang umihi o dumumi (hal. banyo, CR) at bihirang mangyari ito sa kanyang salawal.",
    "Nakapaghuhugas ng sarili pagkatapos makapagbawas.",
    "Naipapapakita ang kooperasyon sa tuwing maliligo.",
    "Nakapaghuhugas at nakapagtutuyo ng kamay ng mag-isa.",
    "Nakapaghihilamos ng walang umaalalay.",
    "Nakakaligo ng mag-isa."
  ],
  receptiveLanguage: [
    "Naituturo ang kasapi ng pamilya na tinutukoy",
    "Naituturo ang 5 bahagi ng katawan na tinutukoy",
    "Naituturo ang 5 binanggit na larawan mula ipinakikitang aklat",
    "Nakasusunod sa isang antas na utos na may simpleng pang-ukol (hal. Sa ibabaw, sa ilalim, sa loob)",
    "Nakasusunod sa dalawang antas na utos na may simpleng pang- ukol(hal. Kunin sa ilalim mesa ang bola at ilagay sa loob ng bag)"
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
    "Nasusundan ng tingin ang direksyon ng nahuhulog na bagay",
    "Nahahanap ang mga bagay na nakatago o natatakpan",
    "Nagagaya ang mga kilos na kakakita pa lamang",
    "Nag-aalok ng isang bagay ngunit hindi ito binibitawan.",
    "Nahahanap ang nakatagong bagay.",
    "Nagpapakita ng simpleng pagpapanggap sa paglalaro",
    "Nakapagtutugma ng mga bagay-bagay",
    "Nakapagtutugma ng 2-3 kulay",
    "Nakapagtutugma ng mga larawan",
    "Nauuri ang mga hugis ayon sa sukat o kulay",
    "Nauuri ang mga bagay ayon sa 2 katangian (hal. laki at kulay)",
    "Naiaayos ang mga bagay mula sa pinakamaliit hanggang sa pinakamalaki",
    "Nakikilala ang 4 hanggang 6 na kulay",
    "Natutulad ang mga hugis",
    "Nakababanggit ng 3 hayop o gulay kapag tinanong",
    "Nasasabi ang gamit ng mga bagay sa bahay",
    "Nakabubuo ng isang simpleng puzzle",
    "Nauunawaan ang magkasalungat na mga salita sa pamamagitan ng pagkumpleto ng pangungusap (hal. Ang aso ay malaki , ang daga ay?",
    "Naituturo ang kaliwa at kanang bahagi ng katawan",
    "Nasasabi kung ano ang mali sa larawan ( hal. Ano ang mali sa larawang ito?",
    "Napagtutugma ang malaki at maliit na mga titik"
  ],
  socioEmotional: [
    "Masayang pinapanood ang mga gawain ng mga tao o hayop sa malapit na lugar/kapaligiran",
    "Nakalalapit sa mga hindi kakilala ngunit sa simula ay maaaring maging mahiyain o hindi mapalagay.",
    "Nakapaglalarong mag-isa ngunit nais na malapit sa mga kakilalang nakatatanda o kapatid",
    "Tumatawa/tumitili nang malakas habang naglalaro.",
    "Naglalaro ng \"bulaga\"",
    "Napagugulong ang bola papunta sa kalaro",
    "Niyayakap ang mga laruan",
    "Nagpapakita ng respeto sa nakatatanda gamit ang \"opo\" o \"po\" (o anumang katumbas nito) sa halip na kanilang pangalan.",
    "Nagpapahihiram ng sariling laruan sa iba.",
    "Nagagaya ang mga ginagawa ng nakatatanda (hal. pagluluto, paghuhugas)",
    "Natutukoy ang damdamin ng iba.",
    "Naisasagawa ang mga kilos na naaayon sa kultura na hindi na hinihiling/iniuutos (hal. Pagmamano, paghalik).",
    "Naaliw ang mga kalaro o kapatid kung nababalisa/nag-aalala",
    "Nagsisikap na masolusyunan kung may hadlang o problema sa kanyang nais gawin.",
    "Nakatutulong sa mga gawaing pambahay (hal. nagpupunas ng mesa, nagdidilig ng mga halaman).",
    "Nakapag-uusisa tungkol sa kapaligiran ngunit alam kung kailangang huminto sa pagtatanong.",
    "Nakapaghihintay ng pagkakataon (hal. Sa paghuhugas ng kamay, sa pagkuha ng pagkain).",
    "Nakahihingi ng permiso na malaro ang mga laruan na ginagamit ng ibang bata.",
    "Naipagtatanggol ang sariling pag-aari nang may determinasyon.",
    "Naglalaro nang maayos sa mga pangkatang laro (hal. hindi nandadaya para manalo).",
    "Naikukwento ang mga mabigat na nararamdaman (hal. Galit, lungkot).",
    "Natatanggap ang isang kasunduang ginawa ng tagapag-alaga (hal. Linisin muna ang kuwarto bago maglaro sa labas).",
    "Naipakikita ang responsibilidad sa pagbabantay sa mga nakababatang kapatid/myembro ng pamilya.",
    "Nakatutulong sa mga nakakatanda at nakababata sa anumang sitwasyon upang maiwasan ang bangayan/pakikipag-away"
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

export const getAutomaticSchoolYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  // Academic year typically starts in August/September in PH, but May is a common transition month mentioned in requirement
  if (currentMonth >= 4) return `${currentYear}-${currentYear + 1}`;
  return `${currentYear - 1}-${currentYear}`;
};

// Added missing constants mentioned in error logs to satisfy external references (placeholders)
export const INITIAL_GRADE_COMPONENTS = {};
export const INITIAL_STUDENT_GRADES = [];
export const SUBJECTS = [];
export const MAPEH_COMPONENTS = [];
export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
export const calculateTransmutedGrade = (score: number) => score;