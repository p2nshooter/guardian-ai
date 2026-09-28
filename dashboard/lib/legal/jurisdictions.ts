/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * LEGAL AI — JURISDICTIONS
 *
 * Every sovereign state (plus Hong Kong, Macau, Taiwan, Kosovo, Palestine and
 * the Holy See), the European Union and public international law. For each:
 * its legal traditions, the sub-national units whose law differs (states,
 * provinces, regions, special regimes such as Aceh, Québec, Scotland, DIFC),
 * official sources to cite and recent landmark changes the AI must check.
 *
 * Used on the server (prompt building + validation) and in the browser
 * (pickers, public SEO pages). Country names are localised in the browser
 * with Intl.DisplayNames, so only English is stored here.
 *
 * Facts here are deliberately conservative: the AI is always instructed to
 * verify currency against the official sources and to say when it cannot.
 * ============================================================================ */

export type Tradition = "civil" | "common" | "islamic" | "customary" | "socialist";
export type Region = "africa" | "americas" | "asia" | "europe" | "middle-east" | "oceania" | "supranational";

export interface Country { code: string; name: string; region: Region; systems: Tradition[] }
export interface Subdivision { code: string; name: string; note?: string }

const T: Record<string, Tradition> = { C: "civil", K: "common", I: "islamic", U: "customary", S: "socialist" };
const c = (code: string, name: string, region: Region, sys: string): Country => ({ code, name, region, systems: sys.split("").map((x) => T[x]) });

export const COUNTRIES: Country[] = [
  // ── Supranational / international ───────────────────────────────────────
  c("EU", "European Union (EU law)", "supranational", "C"),
  c("INT", "Public international law & treaties", "supranational", "C"),
  // ── Africa ───────────────────────────────────────────────────────────────
  c("DZ", "Algeria", "africa", "CI"), c("AO", "Angola", "africa", "CU"), c("BJ", "Benin", "africa", "CU"),
  c("BW", "Botswana", "africa", "CKU"), c("BF", "Burkina Faso", "africa", "CU"), c("BI", "Burundi", "africa", "CU"),
  c("CV", "Cabo Verde", "africa", "C"), c("CM", "Cameroon", "africa", "CKU"), c("CF", "Central African Republic", "africa", "CU"),
  c("TD", "Chad", "africa", "CIU"), c("KM", "Comoros", "africa", "CIU"), c("CG", "Congo", "africa", "CU"),
  c("CD", "Congo (Democratic Republic)", "africa", "CU"), c("CI", "Côte d'Ivoire", "africa", "CU"), c("DJ", "Djibouti", "africa", "CIU"),
  c("EG", "Egypt", "africa", "CI"), c("GQ", "Equatorial Guinea", "africa", "CU"), c("ER", "Eritrea", "africa", "CIU"),
  c("SZ", "Eswatini", "africa", "CKU"), c("ET", "Ethiopia", "africa", "CUI"), c("GA", "Gabon", "africa", "CU"),
  c("GM", "Gambia", "africa", "KIU"), c("GH", "Ghana", "africa", "KU"), c("GN", "Guinea", "africa", "CIU"),
  c("GW", "Guinea-Bissau", "africa", "CU"), c("KE", "Kenya", "africa", "KIU"), c("LS", "Lesotho", "africa", "CKU"),
  c("LR", "Liberia", "africa", "KU"), c("LY", "Libya", "africa", "CI"), c("MG", "Madagascar", "africa", "CU"),
  c("MW", "Malawi", "africa", "KU"), c("ML", "Mali", "africa", "CIU"), c("MR", "Mauritania", "africa", "CI"),
  c("MU", "Mauritius", "africa", "CK"), c("MA", "Morocco", "africa", "CI"), c("MZ", "Mozambique", "africa", "CU"),
  c("NA", "Namibia", "africa", "CKU"), c("NE", "Niger", "africa", "CIU"), c("NG", "Nigeria", "africa", "KIU"),
  c("RW", "Rwanda", "africa", "CKU"), c("ST", "São Tomé and Príncipe", "africa", "C"), c("SN", "Senegal", "africa", "CU"),
  c("SC", "Seychelles", "africa", "CK"), c("SL", "Sierra Leone", "africa", "KU"), c("SO", "Somalia", "africa", "CIU"),
  c("ZA", "South Africa", "africa", "CKU"), c("SS", "South Sudan", "africa", "KU"), c("SD", "Sudan", "africa", "IKU"),
  c("TZ", "Tanzania", "africa", "KIU"), c("TG", "Togo", "africa", "CU"), c("TN", "Tunisia", "africa", "CI"),
  c("UG", "Uganda", "africa", "KU"), c("ZM", "Zambia", "africa", "KU"), c("ZW", "Zimbabwe", "africa", "CKU"),
  // ── Americas ─────────────────────────────────────────────────────────────
  c("AG", "Antigua and Barbuda", "americas", "K"), c("AR", "Argentina", "americas", "C"), c("BS", "Bahamas", "americas", "K"),
  c("BB", "Barbados", "americas", "K"), c("BZ", "Belize", "americas", "K"), c("BO", "Bolivia", "americas", "CU"),
  c("BR", "Brazil", "americas", "C"), c("CA", "Canada", "americas", "KC"), c("CL", "Chile", "americas", "C"),
  c("CO", "Colombia", "americas", "C"), c("CR", "Costa Rica", "americas", "C"), c("CU", "Cuba", "americas", "CS"),
  c("DM", "Dominica", "americas", "K"), c("DO", "Dominican Republic", "americas", "C"), c("EC", "Ecuador", "americas", "C"),
  c("SV", "El Salvador", "americas", "C"), c("GD", "Grenada", "americas", "K"), c("GT", "Guatemala", "americas", "CU"),
  c("GY", "Guyana", "americas", "KC"), c("HT", "Haiti", "americas", "C"), c("HN", "Honduras", "americas", "C"),
  c("JM", "Jamaica", "americas", "K"), c("MX", "Mexico", "americas", "C"), c("NI", "Nicaragua", "americas", "C"),
  c("PA", "Panama", "americas", "C"), c("PY", "Paraguay", "americas", "C"), c("PE", "Peru", "americas", "C"),
  c("KN", "Saint Kitts and Nevis", "americas", "K"), c("LC", "Saint Lucia", "americas", "KC"), c("VC", "Saint Vincent and the Grenadines", "americas", "K"),
  c("SR", "Suriname", "americas", "C"), c("TT", "Trinidad and Tobago", "americas", "K"), c("US", "United States", "americas", "K"),
  c("UY", "Uruguay", "americas", "C"), c("VE", "Venezuela", "americas", "C"),
  // ── Asia ─────────────────────────────────────────────────────────────────
  c("AF", "Afghanistan", "asia", "ICU"), c("AM", "Armenia", "asia", "C"), c("AZ", "Azerbaijan", "asia", "C"),
  c("BD", "Bangladesh", "asia", "KI"), c("BT", "Bhutan", "asia", "CU"), c("BN", "Brunei", "asia", "KI"),
  c("KH", "Cambodia", "asia", "CU"), c("CN", "China", "asia", "CS"), c("GE", "Georgia", "asia", "C"),
  c("HK", "Hong Kong SAR", "asia", "K"), c("IN", "India", "asia", "KIU"), c("ID", "Indonesia", "asia", "CIU"),
  c("JP", "Japan", "asia", "C"), c("KZ", "Kazakhstan", "asia", "C"), c("KG", "Kyrgyzstan", "asia", "CU"),
  c("LA", "Laos", "asia", "CS"), c("MO", "Macau SAR", "asia", "C"), c("MY", "Malaysia", "asia", "KIU"),
  c("MV", "Maldives", "asia", "IK"), c("MN", "Mongolia", "asia", "C"), c("MM", "Myanmar", "asia", "KU"),
  c("NP", "Nepal", "asia", "KCU"), c("KP", "North Korea", "asia", "CS"), c("PK", "Pakistan", "asia", "KI"),
  c("PH", "Philippines", "asia", "CKI"), c("SG", "Singapore", "asia", "K"), c("KR", "South Korea", "asia", "C"),
  c("LK", "Sri Lanka", "asia", "KCU"), c("TW", "Taiwan", "asia", "C"), c("TJ", "Tajikistan", "asia", "C"),
  c("TH", "Thailand", "asia", "C"), c("TL", "Timor-Leste", "asia", "CU"), c("TM", "Turkmenistan", "asia", "C"),
  c("UZ", "Uzbekistan", "asia", "C"), c("VN", "Vietnam", "asia", "CS"),
  // ── Middle East ──────────────────────────────────────────────────────────
  c("BH", "Bahrain", "middle-east", "CI"), c("CY", "Cyprus", "europe", "KC"), c("IR", "Iran", "middle-east", "IC"),
  c("IQ", "Iraq", "middle-east", "CI"), c("IL", "Israel", "middle-east", "KC"), c("JO", "Jordan", "middle-east", "CI"),
  c("KW", "Kuwait", "middle-east", "CI"), c("LB", "Lebanon", "middle-east", "CI"), c("OM", "Oman", "middle-east", "IC"),
  c("PS", "Palestine", "middle-east", "CIK"), c("QA", "Qatar", "middle-east", "CI"), c("SA", "Saudi Arabia", "middle-east", "I"),
  c("SY", "Syria", "middle-east", "CI"), c("TR", "Türkiye", "middle-east", "C"), c("AE", "United Arab Emirates", "middle-east", "CI"),
  c("YE", "Yemen", "middle-east", "IC"),
  // ── Europe ───────────────────────────────────────────────────────────────
  c("AL", "Albania", "europe", "C"), c("AD", "Andorra", "europe", "CU"), c("AT", "Austria", "europe", "C"),
  c("BY", "Belarus", "europe", "C"), c("BE", "Belgium", "europe", "C"), c("BA", "Bosnia and Herzegovina", "europe", "C"),
  c("BG", "Bulgaria", "europe", "C"), c("HR", "Croatia", "europe", "C"), c("CZ", "Czechia", "europe", "C"),
  c("DK", "Denmark", "europe", "C"), c("EE", "Estonia", "europe", "C"), c("FI", "Finland", "europe", "C"),
  c("FR", "France", "europe", "C"), c("DE", "Germany", "europe", "C"), c("GR", "Greece", "europe", "C"),
  c("VA", "Holy See (Vatican City)", "europe", "C"), c("HU", "Hungary", "europe", "C"), c("IS", "Iceland", "europe", "C"),
  c("IE", "Ireland", "europe", "K"), c("IT", "Italy", "europe", "C"), c("XK", "Kosovo", "europe", "C"),
  c("LV", "Latvia", "europe", "C"), c("LI", "Liechtenstein", "europe", "C"), c("LT", "Lithuania", "europe", "C"),
  c("LU", "Luxembourg", "europe", "C"), c("MT", "Malta", "europe", "CK"), c("MD", "Moldova", "europe", "C"),
  c("MC", "Monaco", "europe", "C"), c("ME", "Montenegro", "europe", "C"), c("NL", "Netherlands", "europe", "C"),
  c("MK", "North Macedonia", "europe", "C"), c("NO", "Norway", "europe", "C"), c("PL", "Poland", "europe", "C"),
  c("PT", "Portugal", "europe", "C"), c("RO", "Romania", "europe", "C"), c("RU", "Russia", "europe", "C"),
  c("SM", "San Marino", "europe", "C"), c("RS", "Serbia", "europe", "C"), c("SK", "Slovakia", "europe", "C"),
  c("SI", "Slovenia", "europe", "C"), c("ES", "Spain", "europe", "C"), c("SE", "Sweden", "europe", "C"),
  c("CH", "Switzerland", "europe", "C"), c("UA", "Ukraine", "europe", "C"), c("GB", "United Kingdom", "europe", "K"),
  // ── Oceania ──────────────────────────────────────────────────────────────
  c("AU", "Australia", "oceania", "K"), c("FJ", "Fiji", "oceania", "KU"), c("KI", "Kiribati", "oceania", "KU"),
  c("MH", "Marshall Islands", "oceania", "KU"), c("FM", "Micronesia", "oceania", "KU"), c("NR", "Nauru", "oceania", "KU"),
  c("NZ", "New Zealand", "oceania", "KU"), c("PW", "Palau", "oceania", "KU"), c("PG", "Papua New Guinea", "oceania", "KU"),
  c("WS", "Samoa", "oceania", "KU"), c("SB", "Solomon Islands", "oceania", "KU"), c("TO", "Tonga", "oceania", "KU"),
  c("TV", "Tuvalu", "oceania", "KU"), c("VU", "Vanuatu", "oceania", "KCU"),
];

const BY_CODE = new Map(COUNTRIES.map((x) => [x.code, x]));
export const getCountry = (code: string | undefined | null) => (code ? BY_CODE.get(code.toUpperCase()) : undefined);

// ── Sub-national units whose law (or courts) differ ─────────────────────────
const s = (list: string): Subdivision[] =>
  // Rows are "CODE|Name|optional note"; a note may itself contain semicolons,
  // so only split where the next row's "CODE|" begins.
  list.split(/;\s*(?=[A-Z0-9]{1,6}\|)/).map((row) => row.trim()).filter(Boolean).map((row) => {
    const [code, name, note] = row.split("|").map((x) => x.trim());
    return { code, name, ...(note ? { note } : {}) };
  });

export const SUBDIVISIONS: Record<string, Subdivision[]> = {
  ID: s(`AC|Aceh|Special autonomy (UU 11/2006 on the Governing of Aceh): Qanun, including Qanun Jinayat (Islamic criminal law) applied by the Mahkamah Syar'iyah alongside national law;
    SU|Sumatera Utara; SB|Sumatera Barat|Strong Minangkabau adat (customary) land law — tanah ulayat/pusako; RI|Riau; KR|Kepulauan Riau|Batam–Bintan–Karimun free trade zones and special economic zones;
    JA|Jambi; SS|Sumatera Selatan; BB|Kepulauan Bangka Belitung; BE|Bengkulu; LA|Lampung;
    JK|DKI Jakarta / Daerah Khusus Jakarta|Special region status after the capital relocation (UU 2/2024 on the Province of Daerah Khusus Jakarta);
    JB|Jawa Barat; BT|Banten; JT|Jawa Tengah; YO|DI Yogyakarta|Special status (UU 13/2012 on the Specialty of Yogyakarta): the Sultan is governor; Sultanate and Pakualaman land (Sultan Ground / Pakualaman Ground);
    JI|Jawa Timur; BA|Bali|Customary villages (desa adat) and awig-awig recognised by provincial regulation (Perda Bali 4/2019 on Desa Adat);
    NB|Nusa Tenggara Barat; NT|Nusa Tenggara Timur; KB|Kalimantan Barat; KT|Kalimantan Tengah; KS|Kalimantan Selatan;
    KI|Kalimantan Timur|Hosts the new capital Ibu Kota Nusantara (UU 3/2022, amended by UU 21/2023), governed by the Otorita IKN;
    KU|Kalimantan Utara; SA|Sulawesi Utara; GO|Gorontalo; ST|Sulawesi Tengah; SR|Sulawesi Barat; SN|Sulawesi Selatan; SG|Sulawesi Tenggara;
    MA|Maluku; MU|Maluku Utara;
    PA|Papua|Special Autonomy (UU 21/2001, amended by UU 2/2021); Papuan People's Assembly (MRP) and customary (adat) rights;
    PB|Papua Barat|Papua Special Autonomy regime applies; PS|Papua Selatan|Papua Special Autonomy regime applies (new province, 2022);
    PT|Papua Tengah|Papua Special Autonomy regime applies (new province, 2022); PE|Papua Pegunungan|Papua Special Autonomy regime applies (new province, 2022);
    PD|Papua Barat Daya|Papua Special Autonomy regime applies (new province, 2022)`),
  US: s(`AL|Alabama; AK|Alaska; AZ|Arizona; AR|Arkansas; CA|California; CO|Colorado; CT|Connecticut; DE|Delaware|Leading corporate law (DGCL) and the Court of Chancery;
    DC|District of Columbia; FL|Florida; GA|Georgia; HI|Hawaii; ID|Idaho; IL|Illinois; IN|Indiana; IA|Iowa; KS|Kansas; KY|Kentucky;
    LA|Louisiana|Civil-law tradition for private law (Louisiana Civil Code); ME|Maine; MD|Maryland; MA|Massachusetts; MI|Michigan; MN|Minnesota;
    MS|Mississippi; MO|Missouri; MT|Montana; NE|Nebraska; NV|Nevada; NH|New Hampshire; NJ|New Jersey; NM|New Mexico; NY|New York;
    NC|North Carolina; ND|North Dakota; OH|Ohio; OK|Oklahoma; OR|Oregon; PA|Pennsylvania; RI|Rhode Island; SC|South Carolina;
    SD|South Dakota; TN|Tennessee; TX|Texas; UT|Utah; VT|Vermont; VA|Virginia; WA|Washington; WV|West Virginia; WI|Wisconsin; WY|Wyoming;
    PR|Puerto Rico|Civil-law tradition in private law (Puerto Rico Civil Code), federal law applies; GU|Guam; VI|U.S. Virgin Islands;
    AS|American Samoa; MP|Northern Mariana Islands; FED|Federal law only|Federal statutes, regulations and federal courts`),
  CA: s(`AB|Alberta; BC|British Columbia; MB|Manitoba; NB|New Brunswick|Officially bilingual province; NL|Newfoundland and Labrador; NS|Nova Scotia;
    ON|Ontario; PE|Prince Edward Island; QC|Québec|Civil law for private law (Civil Code of Québec); French is the official language of legislation;
    SK|Saskatchewan; NT|Northwest Territories; NU|Nunavut; YT|Yukon; FED|Federal law only|Federal statutes and the Federal Court`),
  AU: s(`NSW|New South Wales; VIC|Victoria; QLD|Queensland; WA|Western Australia; SA|South Australia; TAS|Tasmania;
    ACT|Australian Capital Territory; NT|Northern Territory; CTH|Commonwealth law only|Federal statutes and the Federal Court`),
  IN: s(`AP|Andhra Pradesh; AR|Arunachal Pradesh; AS|Assam; BR|Bihar; CG|Chhattisgarh; GA|Goa|The Portuguese-era Goa Civil Code (uniform family and succession law) applies;
    GJ|Gujarat; HR|Haryana; HP|Himachal Pradesh; JH|Jharkhand; KA|Karnataka; KL|Kerala; MP|Madhya Pradesh; MH|Maharashtra;
    MN|Manipur; ML|Meghalaya|Sixth Schedule tribal autonomous councils; MZ|Mizoram|Article 371G protections for Mizo customary law; NL|Nagaland|Article 371A protections for Naga customary law;
    OD|Odisha; PB|Punjab; RJ|Rajasthan; SK|Sikkim|Article 371F; TN|Tamil Nadu; TG|Telangana; TR|Tripura; UP|Uttar Pradesh;
    UK|Uttarakhand|State Uniform Civil Code enacted in 2024 — verify its current application; WB|West Bengal;
    AN|Andaman and Nicobar Islands; CH|Chandigarh; DH|Dadra and Nagar Haveli and Daman and Diu; DL|Delhi (NCT);
    JK|Jammu and Kashmir|Union territory since 2019 (J&K Reorganisation Act 2019); LA|Ladakh; LD|Lakshadweep; PY|Puducherry`),
  MY: s(`JHR|Johor; KDH|Kedah; KTN|Kelantan|State Syariah criminal enactments; MLK|Melaka; NSN|Negeri Sembilan|Adat perpatih customary law;
    PHG|Pahang; PNG|Pulau Pinang; PRK|Perak; PLS|Perlis; SGR|Selangor; TRG|Terengganu;
    SBH|Sabah|Own land law, immigration control and Native Courts (Malaysia Agreement 1963); SWK|Sarawak|Own land code, immigration control and Native Courts (Malaysia Agreement 1963);
    KUL|Kuala Lumpur (Federal Territory); LBN|Labuan (Federal Territory)|Labuan International Business and Financial Centre regime; PJY|Putrajaya (Federal Territory)`),
  GB: s(`ENG|England|England & Wales jurisdiction; WLS|Wales|England & Wales jurisdiction with devolved Senedd legislation (Acts and Measures);
    SCT|Scotland|Separate mixed (civil/common) legal system — Scots law, Court of Session, High Court of Justiciary; NIR|Northern Ireland|Separate jurisdiction and courts; devolved Assembly legislation`),
  DE: s(`BW|Baden-Württemberg; BY|Bayern (Bavaria); BE|Berlin; BB|Brandenburg; HB|Bremen; HH|Hamburg; HE|Hessen; MV|Mecklenburg-Vorpommern;
    NI|Niedersachsen; NW|Nordrhein-Westfalen; RP|Rheinland-Pfalz; SL|Saarland; SN|Sachsen; ST|Sachsen-Anhalt; SH|Schleswig-Holstein; TH|Thüringen`),
  BR: s(`AC|Acre; AL|Alagoas; AP|Amapá; AM|Amazonas|Manaus Free Trade Zone; BA|Bahia; CE|Ceará; DF|Distrito Federal; ES|Espírito Santo; GO|Goiás;
    MA|Maranhão; MT|Mato Grosso; MS|Mato Grosso do Sul; MG|Minas Gerais; PA|Pará; PB|Paraíba; PR|Paraná; PE|Pernambuco; PI|Piauí;
    RJ|Rio de Janeiro; RN|Rio Grande do Norte; RS|Rio Grande do Sul; RO|Rondônia; RR|Roraima; SC|Santa Catarina; SP|São Paulo; SE|Sergipe; TO|Tocantins`),
  MX: s(`AGU|Aguascalientes; BCN|Baja California; BCS|Baja California Sur; CAM|Campeche; CHP|Chiapas; CHH|Chihuahua; CMX|Ciudad de México;
    COA|Coahuila; COL|Colima; DUR|Durango; GUA|Guanajuato; GRO|Guerrero; HID|Hidalgo; JAL|Jalisco; MEX|Estado de México; MIC|Michoacán;
    MOR|Morelos; NAY|Nayarit; NLE|Nuevo León; OAX|Oaxaca|Indigenous normative systems (usos y costumbres) recognised; PUE|Puebla; QUE|Querétaro; ROO|Quintana Roo;
    SLP|San Luis Potosí; SIN|Sinaloa; SON|Sonora; TAB|Tabasco; TAM|Tamaulipas; TLA|Tlaxcala; VER|Veracruz; YUC|Yucatán; ZAC|Zacatecas; FED|Federal law only`),
  ES: s(`AN|Andalucía; AR|Aragón|Own civil law (Código del Derecho Foral de Aragón); AS|Asturias; IB|Illes Balears|Own civil law (Compilación de Derecho Civil de las Illes Balears);
    CN|Canarias|Special tax regime (REF, IGIC); CB|Cantabria; CL|Castilla y León; CM|Castilla-La Mancha; CT|Cataluña|Own civil law (Codi civil de Catalunya);
    EX|Extremadura; GA|Galicia|Own civil law (Lei de dereito civil de Galicia); MD|Comunidad de Madrid; MC|Región de Murcia;
    NC|Navarra|Own civil law (Fuero Nuevo) and own tax system (Convenio Económico); PV|País Vasco|Own civil law (Ley de Derecho Civil Vasco) and own tax system (Concierto Económico);
    RI|La Rioja; VC|Comunitat Valenciana; CE|Ceuta; ML|Melilla`),
  IT: s(`65|Abruzzo; 77|Basilicata; 78|Calabria; 72|Campania; 45|Emilia-Romagna; 36|Friuli-Venezia Giulia|Special-statute region; 62|Lazio; 42|Liguria;
    25|Lombardia; 57|Marche; 67|Molise; 21|Piemonte; 75|Puglia; 88|Sardegna|Special-statute region; 82|Sicilia|Special-statute region; 52|Toscana;
    32|Trentino-Alto Adige/Südtirol|Special-statute region; autonomous provinces of Trento and Bolzano; 55|Umbria; 23|Valle d'Aosta|Special-statute region; 34|Veneto`),
  CH: s(`ZH|Zürich; BE|Bern; LU|Luzern; UR|Uri; SZ|Schwyz; OW|Obwalden; NW|Nidwalden; GL|Glarus; ZG|Zug; FR|Fribourg; SO|Solothurn;
    BS|Basel-Stadt; BL|Basel-Landschaft; SH|Schaffhausen; AR|Appenzell Ausserrhoden; AI|Appenzell Innerrhoden; SG|St. Gallen; GR|Graubünden;
    AG|Aargau; TG|Thurgau; TI|Ticino; VD|Vaud; VS|Valais; NE|Neuchâtel; GE|Genève; JU|Jura; FED|Federal law only`),
  AE: s(`AZ|Abu Dhabi; DU|Dubai; SH|Sharjah; AJ|Ajman; UQ|Umm Al Quwain; RK|Ras Al Khaimah; FU|Fujairah;
    DIFC|Dubai International Financial Centre (DIFC)|Own common-law-based civil and commercial laws and DIFC Courts;
    ADGM|Abu Dhabi Global Market (ADGM)|English common law applies directly; ADGM Courts; FED|Federal law only`),
  NG: s(`AB|Abia; AD|Adamawa; AK|Akwa Ibom; AN|Anambra; BA|Bauchi|Sharia penal code state; BY|Bayelsa; BE|Benue; BO|Borno|Sharia penal code state;
    CR|Cross River; DE|Delta; EB|Ebonyi; ED|Edo; EK|Ekiti; EN|Enugu; GO|Gombe|Sharia penal code state; IM|Imo; JI|Jigawa|Sharia penal code state;
    KD|Kaduna|Sharia penal law in parts of the state; KN|Kano|Sharia penal code state; KT|Katsina|Sharia penal code state; KE|Kebbi|Sharia penal code state;
    KO|Kogi; KW|Kwara; LA|Lagos; NA|Nasarawa; NI|Niger|Sharia penal code state; OG|Ogun; ON|Ondo; OS|Osun; OY|Oyo; PL|Plateau; RI|Rivers;
    SO|Sokoto|Sharia penal code state; TA|Taraba; YO|Yobe|Sharia penal code state; ZA|Zamfara|Sharia penal code state; FC|Federal Capital Territory (Abuja)`),
  ZA: s(`EC|Eastern Cape; FS|Free State; GP|Gauteng; KZN|KwaZulu-Natal; LP|Limpopo; MP|Mpumalanga; NW|North West; NC|Northern Cape; WC|Western Cape`),
  AR: s(`C|Ciudad Autónoma de Buenos Aires; B|Buenos Aires; K|Catamarca; H|Chaco; U|Chubut; X|Córdoba; W|Corrientes; E|Entre Ríos; P|Formosa;
    Y|Jujuy; L|La Pampa; F|La Rioja; M|Mendoza; N|Misiones; Q|Neuquén; R|Río Negro; A|Salta; J|San Juan; D|San Luis; Z|Santa Cruz;
    S|Santa Fe; G|Santiago del Estero; V|Tierra del Fuego; T|Tucumán`),
  PK: s(`PB|Punjab; SD|Sindh; KP|Khyber Pakhtunkhwa|Former FATA merged in 2018; BA|Balochistan; IS|Islamabad Capital Territory;
    GB|Gilgit-Baltistan|Separate governance order; JK|Azad Jammu and Kashmir|Own interim constitution and courts`),
  SA: s(`01|Riyadh; 02|Makkah; 03|Madinah; 04|Eastern Province; 14|Asir; 07|Tabuk; 05|Al-Qassim; 06|Ha'il; 08|Northern Borders; 09|Jazan; 10|Najran; 11|Al-Bahah; 12|Al-Jawf`),
  PH: s(`NCR|National Capital Region (Metro Manila); CAR|Cordillera Administrative Region|Indigenous Peoples' Rights Act (IPRA) ancestral domains; 01|Ilocos Region (I); 02|Cagayan Valley (II);
    03|Central Luzon (III); 40|CALABARZON (IV-A); 41|MIMAROPA; 05|Bicol Region (V); 06|Western Visayas (VI); NIR|Negros Island Region; 07|Central Visayas (VII);
    08|Eastern Visayas (VIII); 09|Zamboanga Peninsula (IX); 10|Northern Mindanao (X); 11|Davao Region (XI); 12|SOCCSKSARGEN (XII); 13|Caraga (XIII);
    BARMM|Bangsamoro Autonomous Region in Muslim Mindanao|Bangsamoro Organic Law (RA 11054); Shari'a courts for personal-status matters of Muslims (PD 1083)`),
  CN: s(`BJ|Beijing; TJ|Tianjin; SH|Shanghai|Lin-gang Special Area of the Shanghai Free Trade Zone; CQ|Chongqing; HE|Hebei; SX|Shanxi; NM|Inner Mongolia (autonomous region);
    LN|Liaoning; JL|Jilin; HL|Heilongjiang; JS|Jiangsu; ZJ|Zhejiang; AH|Anhui; FJ|Fujian; JX|Jiangxi; SD|Shandong; HA|Henan; HB|Hubei; HN|Hunan;
    GD|Guangdong|Shenzhen and other special economic zones have their own regulations; GX|Guangxi (autonomous region); HI|Hainan|Hainan Free Trade Port Law (2021);
    SC|Sichuan; GZ|Guizhou; YN|Yunnan; XZ|Tibet / Xizang (autonomous region); SN|Shaanxi; GS|Gansu; QH|Qinghai; NX|Ningxia (autonomous region); XJ|Xinjiang (autonomous region)`),
  JP: s(`01|Hokkaido; 02|Aomori; 03|Iwate; 04|Miyagi; 05|Akita; 06|Yamagata; 07|Fukushima; 08|Ibaraki; 09|Tochigi; 10|Gunma; 11|Saitama; 12|Chiba;
    13|Tokyo; 14|Kanagawa; 15|Niigata; 16|Toyama; 17|Ishikawa; 18|Fukui; 19|Yamanashi; 20|Nagano; 21|Gifu; 22|Shizuoka; 23|Aichi; 24|Mie; 25|Shiga;
    26|Kyoto; 27|Osaka; 28|Hyogo; 29|Nara; 30|Wakayama; 31|Tottori; 32|Shimane; 33|Okayama; 34|Hiroshima; 35|Yamaguchi; 36|Tokushima; 37|Kagawa;
    38|Ehime; 39|Kochi; 40|Fukuoka; 41|Saga; 42|Nagasaki; 43|Kumamoto; 44|Oita; 45|Miyazaki; 46|Kagoshima; 47|Okinawa`),
  KR: s(`11|Seoul; 26|Busan; 27|Daegu; 28|Incheon; 29|Gwangju; 30|Daejeon; 31|Ulsan; 50|Sejong; 41|Gyeonggi; 42|Gangwon (special self-governing province);
    43|Chungcheongbuk; 44|Chungcheongnam; 45|Jeonbuk (special self-governing province); 46|Jeollanam; 47|Gyeongsangbuk; 48|Gyeongsangnam;
    49|Jeju (special self-governing province)|Own special act with broad self-governance`),
  CO: s(`DC|Bogotá D.C.; AMA|Amazonas; ANT|Antioquia; ARA|Arauca; ATL|Atlántico; BOL|Bolívar; BOY|Boyacá; CAL|Caldas; CAQ|Caquetá; CAS|Casanare;
    CAU|Cauca; CES|Cesar; CHO|Chocó; COR|Córdoba; CUN|Cundinamarca; GUA|Guainía; GUV|Guaviare; HUI|Huila; LAG|La Guajira; MAG|Magdalena; MET|Meta;
    NAR|Nariño; NSA|Norte de Santander; PUT|Putumayo; QUI|Quindío; RIS|Risaralda; SAP|San Andrés, Providencia y Santa Catalina; SAN|Santander; SUC|Sucre;
    TOL|Tolima; VAC|Valle del Cauca; VAU|Vaupés; VID|Vichada`),
  CL: s(`AP|Arica y Parinacota; TA|Tarapacá; AN|Antofagasta; AT|Atacama; CO|Coquimbo; VS|Valparaíso; RM|Región Metropolitana de Santiago;
    LI|O'Higgins; ML|Maule; NB|Ñuble; BI|Biobío; AR|La Araucanía; LR|Los Ríos; LL|Los Lagos; AI|Aysén; MA|Magallanes`),
  BE: s(`BRU|Brussels-Capital Region; VLG|Flemish Region (Flanders); WAL|Walloon Region (Wallonia); FED|Federal law only`),
  AT: s(`1|Burgenland; 2|Kärnten; 3|Niederösterreich; 4|Oberösterreich; 5|Salzburg; 6|Steiermark; 7|Tirol; 8|Vorarlberg; 9|Wien`),
  CM: s(`AD|Adamaoua; CE|Centre; ES|Est; EN|Extrême-Nord; LT|Littoral; NO|Nord; NW|Nord-Ouest (North-West)|Common-law region (bijural system); OU|Ouest; SU|Sud; SW|Sud-Ouest (South-West)|Common-law region (bijural system)`),
  FR: s(`MET|Metropolitan France; ALM|Alsace-Moselle|Local law (droit local) survives in several areas, e.g. associations, religion, some civil and commercial rules;
    GP|Guadeloupe (overseas); MQ|Martinique (overseas); GF|French Guiana (overseas); RE|La Réunion (overseas); YT|Mayotte (overseas);
    NC|New Caledonia|Sui generis status with its own laws in many areas; PF|French Polynesia|Overseas collectivity with its own laws in many areas`),
  DK: s(`DK|Denmark; GL|Greenland|Self-government (home rule) with its own legislation in many areas; FO|Faroe Islands|Home rule with its own legislation in many areas`),
  FI: s(`FI|Mainland Finland; AX|Åland Islands|Autonomous: own legislation in many areas`),
  PT: s(`PT|Mainland Portugal; 20|Azores (autonomous region); 30|Madeira (autonomous region)`),
  IQ: s(`FED|Federal Iraq; KRI|Kurdistan Region|Own parliament, government and regional legislation`),
  BA: s(`BIH|Federation of Bosnia and Herzegovina; SRP|Republika Srpska; BRC|Brčko District; STATE|State-level law only`),
  TZ: s(`MAIN|Mainland Tanzania; ZAN|Zanzibar|Own constitution, legislature and courts (including Kadhi's courts) for non-union matters`),
  KZ: s(`KZ|Kazakhstan (national law); AIFC|Astana International Financial Centre (AIFC)|Common-law-based acts and the AIFC Court`),
  QA: s(`QA|Qatar (national law); QFC|Qatar Financial Centre (QFC)|Own regulations and the Qatar International Court`),
};

// ── Official sources the AI should point to (and search, with live research) ─
export const SOURCES: Record<string, string[]> = {
  INT: ["UN Treaty Collection|https://treaties.un.org", "International Court of Justice|https://www.icj-cij.org", "UNCITRAL|https://uncitral.un.org", "WTO legal texts|https://www.wto.org", "WIPO Lex|https://www.wipo.int/wipolex", "ILO NATLEX|https://natlex.ilo.org", "UNCTAD Investment Policy Hub|https://investmentpolicy.unctad.org"],
  EU: ["EUR-Lex|https://eur-lex.europa.eu", "CJEU case law (Curia)|https://curia.europa.eu", "European Court of Human Rights (HUDOC)|https://hudoc.echr.coe.int"],
  ID: ["JDIH BPK (peraturan)|https://peraturan.bpk.go.id", "Database Peraturan (Kemenkum)|https://peraturan.go.id", "JDIH Nasional|https://jdihn.go.id", "Direktori Putusan Mahkamah Agung|https://putusan3.mahkamahagung.go.id", "Mahkamah Konstitusi|https://www.mkri.id"],
  US: ["Congress.gov|https://www.congress.gov", "U.S. Code|https://uscode.house.gov", "eCFR|https://www.ecfr.gov", "Federal Register|https://www.federalregister.gov", "Supreme Court|https://www.supremecourt.gov", "CourtListener|https://www.courtlistener.com", "Cornell LII|https://www.law.cornell.edu"],
  GB: ["legislation.gov.uk|https://www.legislation.gov.uk", "Find Case Law (National Archives)|https://caselaw.nationalarchives.gov.uk", "BAILII|https://www.bailii.org", "UK Supreme Court|https://www.supremecourt.uk"],
  CA: ["Justice Laws|https://laws-lois.justice.gc.ca", "CanLII|https://www.canlii.org", "Supreme Court of Canada|https://www.scc-csc.ca"],
  AU: ["Federal Register of Legislation|https://www.legislation.gov.au", "AustLII|https://www.austlii.edu.au", "High Court of Australia|https://www.hcourt.gov.au"],
  NZ: ["NZ Legislation|https://www.legislation.govt.nz", "NZLII|https://www.nzlii.org"],
  IN: ["India Code|https://www.indiacode.nic.in", "e-Gazette|https://egazette.gov.in", "Supreme Court of India|https://www.sci.gov.in", "Indian Kanoon|https://indiankanoon.org"],
  SG: ["Singapore Statutes Online|https://sso.agc.gov.sg", "eLitigation judgments|https://www.elitigation.sg", "Judiciary|https://www.judiciary.gov.sg"],
  MY: ["Laws of Malaysia (AGC)|https://lom.agc.gov.my", "Judiciary of Malaysia|https://www.kehakiman.gov.my"],
  PH: ["Official Gazette|https://www.officialgazette.gov.ph", "Supreme Court E-Library|https://elibrary.judiciary.gov.ph", "LawPhil|https://lawphil.net"],
  HK: ["Hong Kong e-Legislation|https://www.elegislation.gov.hk", "Legal Reference System|https://legalref.judiciary.hk", "HKLII|https://www.hklii.hk"],
  DE: ["Gesetze im Internet|https://www.gesetze-im-internet.de", "Bundesgesetzblatt (recht.bund.de)|https://www.recht.bund.de", "Rechtsprechung im Internet|https://www.rechtsprechung-im-internet.de", "Bundesverfassungsgericht|https://www.bundesverfassungsgericht.de"],
  FR: ["Légifrance|https://www.legifrance.gouv.fr", "Conseil constitutionnel|https://www.conseil-constitutionnel.fr", "Cour de cassation|https://www.courdecassation.fr", "Conseil d'État|https://www.conseil-etat.fr"],
  NL: ["Wetten.nl|https://wetten.overheid.nl", "Rechtspraak uitspraken|https://uitspraken.rechtspraak.nl"],
  BE: ["Moniteur belge / Belgisch Staatsblad|https://www.ejustice.just.fgov.be"],
  ES: ["BOE|https://www.boe.es", "CENDOJ (Poder Judicial)|https://www.poderjudicial.es"],
  IT: ["Normattiva|https://www.normattiva.it", "Gazzetta Ufficiale|https://www.gazzettaufficiale.it", "Corte costituzionale|https://www.cortecostituzionale.it"],
  PT: ["Diário da República|https://diariodarepublica.pt"],
  CH: ["Fedlex|https://www.fedlex.admin.ch", "Federal Supreme Court|https://www.bger.ch"],
  AT: ["RIS (Rechtsinformationssystem)|https://www.ris.bka.gv.at"],
  IE: ["Irish Statute Book|https://www.irishstatutebook.ie", "Courts Service|https://www.courts.ie"],
  SE: ["Riksdagen (SFS)|https://www.riksdagen.se", "Lagrummet|https://lagrummet.se"],
  PL: ["ISAP (Sejm)|https://isap.sejm.gov.pl"],
  JP: ["e-Gov Laws|https://laws.e-gov.go.jp", "Japanese Law Translation|https://www.japaneselawtranslation.go.jp", "Courts in Japan|https://www.courts.go.jp"],
  KR: ["National Law Information Center|https://www.law.go.kr", "KLRI English translations|https://elaw.klri.re.kr", "Supreme Court of Korea|https://www.scourt.go.kr"],
  CN: ["National Database of Laws and Regulations|https://flk.npc.gov.cn", "Supreme People's Court|https://www.court.gov.cn"],
  TW: ["Laws & Regulations Database|https://law.moj.gov.tw"],
  TH: ["Office of the Council of State (Krisdika)|https://www.krisdika.go.th", "Royal Thai Government Gazette|https://ratchakitcha.soc.go.th"],
  VN: ["National Database of Legal Documents|https://vbpl.vn", "Official Gazette (Công báo)|https://congbao.chinhphu.vn"],
  AE: ["UAE Legislation|https://uaelegislation.gov.ae", "DIFC Courts|https://www.difccourts.ae", "ADGM|https://www.adgm.com"],
  SA: ["Bureau of Experts (laws)|https://laws.boe.gov.sa", "Ministry of Justice|https://www.moj.gov.sa"],
  QA: ["Al Meezan (Qatar Legal Portal)|https://www.almeezan.qa"],
  ZA: ["Government documents|https://www.gov.za/documents", "SAFLII|https://www.saflii.org", "Constitutional Court|https://www.concourt.org.za"],
  KE: ["Kenya Law|https://kenyalaw.org"],
  GH: ["GhaLII|https://ghalii.org"],
  BR: ["Planalto (legislação)|https://www.planalto.gov.br", "LexML|https://www.lexml.gov.br", "STF|https://portal.stf.jus.br", "STJ|https://www.stj.jus.br"],
  MX: ["Leyes federales (Cámara de Diputados)|https://www.diputados.gob.mx/LeyesBiblio", "Diario Oficial de la Federación|https://www.dof.gob.mx", "SCJN|https://www.scjn.gob.mx"],
  AR: ["Boletín Oficial|https://www.boletinoficial.gob.ar", "InfoLEG / SAIJ|https://www.argentina.gob.ar/normativa", "CSJN|https://www.csjn.gov.ar"],
  CL: ["LeyChile (BCN)|https://www.bcn.cl/leychile"],
  CO: ["SUIN-Juriscol|https://www.suin-juriscol.gov.co", "Corte Constitucional|https://www.corteconstitucional.gov.co"],
  PE: ["SPIJ|https://spij.minjus.gob.pe", "El Peruano|https://www.elperuano.pe"],
  PK: ["Pakistan Code|https://pakistancode.gov.pk", "Supreme Court of Pakistan|https://www.supremecourt.gov.pk"],
  BD: ["Laws of Bangladesh|http://bdlaws.minlaw.gov.bd"],
  LK: ["LawNet|https://www.lawnet.gov.lk"],
  TR: ["Mevzuat|https://www.mevzuat.gov.tr", "Resmî Gazete|https://www.resmigazete.gov.tr", "Constitutional Court|https://www.anayasa.gov.tr"],
  RU: ["Official legal portal|http://pravo.gov.ru"],
  UA: ["Legislation of Ukraine (Rada)|https://zakon.rada.gov.ua"],
  KZ: ["Adilet|https://adilet.zan.kz", "AIFC Court|https://court.aifc.kz"],
};
export const GLOBAL_SOURCES = ["WorldLII|https://www.worldlii.org", "CommonLII|https://www.commonlii.org", "Constitute Project (constitutions)|https://www.constituteproject.org"];

// ── Recent landmark changes the AI must account for (verify before relying) ─
export const RECENT: Record<string, string[]> = {
  ID: [
    "The new Criminal Code (KUHP, UU 1/2023) replaced the colonial-era Wetboek van Strafrecht from 2 January 2026 — apply its transitional rules and the more-favourable-law principle to earlier facts.",
    "A new Code of Criminal Procedure (KUHAP) was enacted in late 2025 to operate alongside the new KUHP — verify the enacted text, number and commencement.",
    "Job Creation Law: Perppu 2/2022 was enacted as UU 6/2023; Constitutional Court Decision 168/PUU-XXI/2023 ordered a separate new employment law — check what has since been enacted.",
    "Personal Data Protection Law (UU 27/2022) is fully applicable since October 2024; check implementing regulations and the data-protection authority.",
    "Hierarchy of laws: UU 12/2011 as amended by UU 15/2019 and UU 13/2022.",
  ],
  IN: [
    "Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita and Bharatiya Sakshya Adhiniyam replaced the IPC, CrPC and Evidence Act from 1 July 2024 (older facts may still fall under the old codes).",
    "Digital Personal Data Protection Act 2023 and its Rules — check which provisions are in force.",
  ],
  EU: [
    "AI Act (Regulation (EU) 2024/1689) applies in phases (prohibitions from February 2025, general-purpose AI from August 2025, most high-risk obligations later) — check the current timetable and any amending 'omnibus' acts.",
    "Digital Services Act, Digital Markets Act, NIS2 Directive and DORA (applicable from 17 January 2025) are in force.",
    "Sustainability reporting and due diligence (CSRD, CSDDD) timelines were changed by 2025 'omnibus' simplification measures — verify the current dates and thresholds.",
  ],
  GB: [
    "Retained EU law became 'assimilated law' under the Retained EU Law (Revocation and Reform) Act 2023.",
    "Economic Crime and Corporate Transparency Act 2023 — including the 'failure to prevent fraud' offence (in force from 1 September 2025).",
    "Data (Use and Access) Act 2025 amends UK GDPR and the Data Protection Act 2018 in stages — check commencement.",
  ],
  US: [
    "Loper Bright Enterprises v. Raimondo (2024) ended Chevron deference — agency interpretations no longer receive automatic deference.",
    "Comprehensive state privacy laws now exist in many states; check the selected state and effective dates.",
  ],
  SA: ["The Civil Transactions Law (first codified civil law, in force since December 2023), the Evidence Law and the Personal Status Law are now codified — cite the codified texts."],
  CN: ["Civil Code (in force 1 January 2021), Personal Information Protection Law (2021) and the revised Company Law (in force 1 July 2024)."],
  AE: ["Federal Decree-Law 45/2021 on personal data protection and Federal Decree-Law 32/2021 on commercial companies; DIFC and ADGM have their own data-protection and company laws."],
};

// ── Hierarchy of norms ───────────────────────────────────────────────────────
export const HIERARCHY: Record<string, string> = {
  ID: "UUD NRI 1945 → Ketetapan MPR → Undang-Undang / Perppu → Peraturan Pemerintah → Peraturan Presiden → Peraturan Daerah Provinsi → Peraturan Daerah Kabupaten/Kota (UU 12/2011 jo. UU 15/2019 jo. UU 13/2022, Art. 7); ministerial and agency regulations bind when ordered by higher law or issued within authority (Art. 8). Jurisprudence: Supreme Court (MA) decisions and SEMA/PERMA; Constitutional Court (MK) decisions are final and binding erga omnes.",
  US: "U.S. Constitution → federal statutes and treaties → federal regulations (CFR) → state constitutions → state statutes → state regulations → local ordinances; binding precedent follows the court hierarchy (U.S. Supreme Court, federal circuits, state supreme courts).",
  GB: "Acts of Parliament (parliamentary sovereignty; no single codified constitution) → secondary legislation → devolved legislation within competence → assimilated (former EU) law as modified → common law; stare decisis (UK Supreme Court, Court of Appeal, High Court).",
  EU: "Treaties (TEU, TFEU) and the Charter of Fundamental Rights → general principles → international agreements → regulations, directives and decisions → delegated and implementing acts; CJEU case law; primacy and direct effect over national law.",
  DE: "Grundgesetz → federal statutes (Bundesrecht bricht Landesrecht, Art. 31 GG) → federal ordinances → Land constitutions, statutes and ordinances → municipal bylaws; Federal Constitutional Court decisions bind all state organs.",
  FR: "Constitution of 1958 and the bloc de constitutionnalité → treaties (Art. 55) → lois and ordonnances → décrets → arrêtés; Conseil constitutionnel (incl. QPC), Cour de cassation and Conseil d'État.",
  IN: "Constitution of India → Acts of Parliament and State Acts (Seventh Schedule lists) → rules, regulations and notifications; Supreme Court decisions are binding on all courts (Art. 141).",
  MY: "Federal Constitution (supreme law, Art. 4) → federal and state laws (Ninth Schedule lists) → subsidiary legislation; state Syariah enactments for Muslims in personal and religious matters; English common law applies where local law is silent (Civil Law Act 1956).",
  SA: "The Basic Law of Governance (1992), with the Qur'an and Sunnah as the constitution → royal decrees and codified laws (nizams) → Council of Ministers resolutions → ministerial regulations; Sharia principles govern gaps.",
  AE: "UAE Constitution → federal laws and decree-laws → cabinet resolutions → local emirate laws in non-federal matters; Sharia is a principal source of legislation; DIFC and ADGM apply their own laws in civil and commercial matters.",
};
export const HIERARCHY_BY_TRADITION: Record<Tradition, string> = {
  civil: "Constitution → codes and statutes → executive regulations → regional/local regulations; case law is persuasive (binding where the constitutional court or a unification mechanism makes it so).",
  common: "Constitution (where codified) → statutes → delegated legislation → binding precedent under stare decisis; equity and custom as recognised.",
  islamic: "Sharia (Qur'an, Sunnah, and the jurisprudence of the recognised schools) as a source of law alongside codified statutes and decrees; personal-status matters are often governed by religious law.",
  customary: "Customary law applies where recognised by the constitution or statute, typically in land, family and local dispute resolution, subject to constitutional rights.",
  socialist: "Constitution and the leading role of the ruling party → national legislature laws → State Council/government decrees → ministerial and local rules; judicial interpretations from the supreme court are binding in practice.",
};

// ── Citation styles ──────────────────────────────────────────────────────────
export const CITATION_STYLES = [
  { id: "auto", name: "Local standard for the jurisdiction" },
  { id: "bluebook", name: "Bluebook (US)" },
  { id: "oscola", name: "OSCOLA (UK)" },
  { id: "aglc", name: "AGLC (Australia)" },
  { id: "mcgill", name: "McGill Guide (Canada)" },
  { id: "id", name: "Indonesian practice (Pasal/ayat, Putusan No.)" },
  { id: "eu", name: "EU official style (ECLI, OJ references)" },
] as const;

/** Flag emoji for ISO-3166 alpha-2 codes (supranational codes get a globe). */
export function flag(code: string): string {
  if (code === "EU") return "🇪🇺";
  if (!/^[A-Z]{2}$/.test(code) || code === "XK") return code === "XK" ? "🇽🇰" : "🌐";
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export function traditionLabel(t: Tradition): string {
  return { civil: "Civil law", common: "Common law", islamic: "Islamic law (Sharia)", customary: "Customary law", socialist: "Socialist law" }[t];
}

export interface JurisdictionPick { country: string; sub?: string; city?: string }

/** Validates a picker value; returns a normalised copy or an error. */
export function normaliseJurisdiction(j: any): JurisdictionPick | { error: string } {
  const country = getCountry(String(j?.country || ""));
  if (!country) return { error: "Choose a country or legal order." };
  const out: JurisdictionPick = { country: country.code };
  const subCode = String(j?.sub || "").trim();
  if (subCode) {
    const sub = (SUBDIVISIONS[country.code] || []).find((x) => x.code === subCode);
    if (!sub) return { error: "That state or province isn't in the list for this country." };
    out.sub = sub.code;
  }
  const city = String(j?.city || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 80);
  if (city) out.city = city;
  return out;
}

export function describeJurisdiction(j: JurisdictionPick): string {
  const country = getCountry(j.country)!;
  const sub = j.sub ? (SUBDIVISIONS[country.code] || []).find((x) => x.code === j.sub) : undefined;
  return [j.city, sub?.name, country.name].filter(Boolean).join(", ");
}

/** Plain-text jurisdiction brief for the system prompt. */
export function jurisdictionBrief(j: JurisdictionPick): string {
  const country = getCountry(j.country)!;
  const sub = j.sub ? (SUBDIVISIONS[country.code] || []).find((x) => x.code === j.sub) : undefined;
  const lines: string[] = [];
  lines.push(`Legal order: ${country.name}${sub ? ` — ${sub.name}` : ""}${j.city ? ` — ${j.city}` : ""}`);
  lines.push(`Legal traditions: ${country.systems.map(traditionLabel).join(" + ")}`);
  if (sub?.note) lines.push(`Special regime for ${sub.name}: ${sub.note}`);
  if (j.city) lines.push(`Local level: ${j.city} — consider local (municipal/regency/county) regulations, local courts and venue rules where relevant.`);
  lines.push(`Hierarchy of norms: ${HIERARCHY[country.code] || HIERARCHY_BY_TRADITION[country.systems[0]]}`);
  const recent = RECENT[country.code];
  if (recent?.length) lines.push(`Recent landmark changes to check:\n${recent.map((r) => `- ${r}`).join("\n")}`);
  const src = [...(SOURCES[country.code] || []), ...GLOBAL_SOURCES].map((x) => { const [n, u] = x.split("|"); return `- ${n}: ${u}`; });
  lines.push(`Official and reliable sources:\n${src.join("\n")}`);
  return lines.join("\n");
}
