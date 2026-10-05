/* Legal AI catalogue — Italiano (see lib/legal/catalog.ts). Loaded only when the portal is in Italian. */
import type { LegalCatalog } from "@/lib/legal/catalog";

const c: LegalCatalog = {
  clauseTypes: {
    confidentiality: "Riservatezza",
    liability: "Limitazione di responsabilità",
    indemnity: "Manleva",
    termination: "Recesso e risoluzione",
    "governing-law": "Legge applicabile",
    disputes: "Risoluzione delle controversie",
    ip: "Proprietà intellettuale",
    "data-protection": "Protezione dei dati",
    payment: "Condizioni di pagamento",
    renewal: "Rinnovo",
    assignment: "Cessione",
    "non-compete": "Patto di non concorrenza",
    "non-solicit": "Divieto di storno",
    warranty: "Garanzie",
    "force-majeure": "Forza maggiore",
    audit: "Diritti di audit",
    insurance: "Assicurazione",
    sla: "Livelli di servizio",
    term: "Durata",
    notice: "Comunicazioni",
  },
  playbooks: {
    "nda-mutual": {
      name: "Accordo di riservatezza reciproco (NDA)",
      side: "Entrambe le parti",
      positions: [
        ["Obblighi reciproci; esclusioni standard (informazioni pubbliche, già note, sviluppate autonomamente, ricevute da terzi); divulgazione solo a chi ha necessità di conoscerle.", "Una tutela unilaterale è accettabile solo se siamo gli unici a divulgare."],
        ["La riservatezza dura 2–5 anni dalla divulgazione (segreti commerciali: finché restano segreti).", "Fino a 7 anni per informazioni altamente sensibili."],
        ["Nessun divieto di storno in un NDA; se la controparte insiste, massimo 12 mesi e solo per i dipendenti.", "12 mesi, esclusi gli annunci di lavoro generici."],
        ["Nessun patto di non concorrenza in un NDA.", "Eliminarlo."],
        ["La divulgazione non comporta alcuna licenza o cessione di proprietà intellettuale.", "—"],
        ["La nostra legge e i nostri tribunali.", "Una legge neutrale (es. Inghilterra e Galles o Singapore) con arbitrato."],
      ],
    },
    "saas-customer": {
      name: "SaaS / servizi — siamo il cliente",
      side: "Cliente",
      positions: [
        ["Massimale del fornitore ≥ 12 mesi di corrispettivi; illimitato (o super-massimale) per violazione dei dati, riservatezza, manleva PI, colpa grave e dolo.", "Massimale ≥ 12 mesi di corrispettivi con super-massimale di 2–3× per violazione dei dati."],
        ["Il fornitore ci manleva per violazioni della PI di terzi e per violazioni della normativa sulla protezione dei dati.", "Almeno la manleva PI."],
        ["Pagamento entro 30–60 giorni da fattura corretta; gli importi contestati possono essere trattenuti in buona fede.", "30 giorni."],
        ["Nessun rinnovo tacito, oppure rinnovo con preavviso ≥ 30 giorni e tetto agli aumenti di prezzo.", "Rinnovo tacito con disdetta di 60 giorni e aumento di prezzo limitato all'inflazione (IPC) o al 5 %."],
        ["Recesso per convenienza con preavviso di 30–90 giorni; risoluzione per inadempimento con 30 giorni per porvi rimedio.", "Solo per inadempimento, con rimborso pro rata dei corrispettivi pagati in anticipo."],
        ["Un DPA conforme all'art. 28 GDPR / UU PDP; notifica delle violazioni ≤ 48 ore; elenco dei sub-responsabili e comunicazione delle modifiche; restituzione o cancellazione dei dati alla fine.", "Notifica delle violazioni ≤ 72 ore."],
        ["Disponibilità ≥ 99,9 % con crediti di servizio e diritto di recesso in caso di disservizi ripetuti.", "99,5 % con crediti."],
        ["Nessuna parte può cedere senza consenso, salvo a società affiliate o successori.", "Il fornitore necessita del nostro consenso; noi possiamo cedere alle nostre affiliate."],
        ["La nostra legge e i nostri tribunali, o arbitrato in una sede neutrale.", "Legge neutrale con arbitrato (SIAC / ICC)."],
      ],
    },
    "saas-vendor": {
      name: "SaaS / servizi — siamo il fornitore",
      side: "Fornitore",
      positions: [
        ["Il nostro massimale = corrispettivi pagati negli ultimi 12 mesi; nessuna responsabilità per danni indiretti o consequenziali o mancato guadagno.", "Massimale fino a 24 mesi di corrispettivi; super-massimale per violazione dei dati ≤ 3×."],
        ["Servizi prestati con ragionevole perizia e diligenza; tutte le altre garanzie escluse nei limiti consentiti dalla legge.", "Aggiungere una garanzia di prestazione con nuova esecuzione come unico rimedio."],
        ["Pagamento entro 30 giorni; interessi di mora; diritto di sospensione previa diffida in caso di mancato pagamento.", "45 giorni."],
        ["Manteniamo tutta la PI sulla piattaforma; il cliente è titolare dei propri dati; licenza limitata d'uso del servizio.", "Il cliente è titolare dei deliverable realizzati appositamente per lui, noi manteniamo la PI preesistente."],
        ["Nessun recesso per convenienza durante il periodo di impegno; risoluzione per inadempimento con 30 giorni per porvi rimedio.", "Recesso per convenienza con pagamento dei corrispettivi residui."],
        ["Audit al massimo una volta l'anno, con preavviso di 30 giorni, prima tramite le nostre certificazioni (SOC 2 / ISO 27001).", "Audit in loco solo dopo un incidente documentato."],
      ],
    },
    "dpa-controller": {
      name: "Accordo sul trattamento dei dati — siamo il titolare",
      side: "Titolare del trattamento",
      positions: [
        ["Trattamento solo su istruzioni documentate; riservatezza del personale; misure di sicurezza; consenso per i sub-responsabili; assistenza per i diritti degli interessati e le DPIA; cancellazione o restituzione alla fine; diritti di audit.", "Autorizzazione scritta generale per i sub-responsabili con comunicazione e diritto di opposizione."],
        ["Violazione dei dati personali notificata senza ingiustificato ritardo ed entro 24–48 ore.", "Entro 72 ore — troppo stretto rispetto alla nostra scadenza (72 ore GDPR / 3 × 24 ore UU PDP), quindi chiedere tempi più rapidi."],
        ["Diritto di effettuare audit o di ricevere report di audit di terzi.", "Prima i report, audit in loco dopo un incidente."],
        ["La responsabilità del responsabile del trattamento per le proprie violazioni non è limitata al di sotto del massimale per violazione dei dati del contratto principale.", "Stesso massimale del contratto principale."],
      ],
    },
    employment: {
      name: "Contratto di lavoro — siamo il datore di lavoro",
      side: "Datore di lavoro",
      positions: [
        ["Riservatezza durante e dopo il rapporto di lavoro.", "—"],
        ["Tutti i risultati del lavoro creati nell'ambito del rapporto spettano al datore di lavoro (fatta salva la legge locale).", "—"],
        ["Solo se valido localmente; ≤ 12 mesi, area e mansioni limitate, con corrispettivo se richiesto dalla legge.", "Affidarsi invece a riservatezza e divieto di storno."],
        ["Preavvisi e motivi conformi ai minimi di legge locali.", "—"],
        ["Legge locale del luogo di lavoro.", "—"],
      ],
    },
  },
  clauses: {
    confidentiality: {
      name: "Riservatezza",
      notes: "Verificare le esclusioni e per quanto tempo sopravvive l'obbligo; i segreti commerciali possono richiedere una tutela senza limiti di tempo.",
      variants: {
        "confidentiality-bal": "Ciascuna parte mantiene riservate tutte le Informazioni Riservate comunicate dall'altra parte e le utilizza esclusivamente per eseguire il presente Contratto o beneficiarne. Non costituiscono Informazioni Riservate le informazioni che (a) sono o diventano pubbliche per cause diverse dalla violazione del presente Contratto, (b) erano legittimamente note al destinatario prima della comunicazione, (c) sono state sviluppate autonomamente senza utilizzare le Informazioni Riservate, o (d) sono state legittimamente ricevute da un terzo non vincolato alla riservatezza. Il destinatario può comunicare le Informazioni Riservate ai propri dipendenti e consulenti che abbiano necessità di conoscerle e siano vincolati da obblighi equivalenti, o quando richiesto dalla legge, dandone tempestiva comunicazione ove consentito. Tali obblighi restano in vigore per [3] anni dalla cessazione del presente Contratto.",
        "confidentiality-short": "Ciascuna parte mantiene segrete le informazioni riservate dell'altra, le utilizza solo per il presente Contratto e le comunica solo a chi ha necessità di conoscerle ed è vincolato da obblighi equivalenti, salvo quanto richiesto dalla legge. La presente clausola sopravvive per [3] anni alla cessazione.",
      },
    },
    liability: {
      name: "Limitazione di responsabilità",
      notes: "La legge locale può non consentire di escludere la responsabilità per morte, lesioni personali, frode, dolo o colpa grave.",
      variants: {
        "liability-bal": "Nessuna parte esclude o limita la propria responsabilità per morte o lesioni personali causate da propria negligenza, per frode o per qualsiasi responsabilità che non possa essere limitata per legge. Fermo quanto precede, nessuna parte risponde di danni indiretti o consequenziali, né di perdita di profitti, ricavi o avviamento. La responsabilità complessiva di ciascuna parte derivante dal o connessa al presente Contratto non può superare il totale dei corrispettivi pagati e dovuti ai sensi del presente Contratto nei [12] mesi precedenti l'evento che ha dato origine alla pretesa, fermo restando che la responsabilità per violazione delle clausole sulla protezione dei dati e sulla riservatezza non può superare [3] volte tale importo.",
        "liability-supplier": "La responsabilità complessiva del Fornitore derivante dal o connessa al presente Contratto, sia contrattuale, extracontrattuale (inclusa la negligenza) o di altra natura, non può superare i corrispettivi pagati dal Cliente nei [12] mesi precedenti la pretesa. Il Fornitore non risponde di perdita di dati, profitti, affari o avviamento, né di danni indiretti o consequenziali, nella misura massima consentita dalla legge.",
        "liability-customer": "La responsabilità complessiva del Fornitore non può superare [il maggiore tra [importo] e [24] mesi di corrispettivi]. I limiti della presente clausola non si applicano alla responsabilità del Fornitore per violazione degli obblighi di riservatezza o di protezione dei dati, alle sue manleve, né in caso di colpa grave o dolo.",
      },
    },
    indemnity: {
      name: "Manleva (violazione della PI)",
      notes: "Abbinare a una procedura di gestione delle pretese; valutare massimali ed esclusioni.",
      variants: {
        "indemnity-bal": "Il Fornitore difende il Cliente da qualsiasi pretesa di terzi secondo cui i Servizi violano i diritti di proprietà intellettuale di tali terzi, e tiene indenne il Cliente dai risarcimenti e dalle spese liquidati in via definitiva o concordati in via transattiva, a condizione che il Cliente (a) informi tempestivamente il Fornitore, (b) consenta al Fornitore di gestire la difesa e la transazione, e (c) presti ragionevole assistenza a spese del Fornitore. Il Fornitore non ha alcun obbligo per pretese derivanti da modifiche non effettuate da lui, da combinazioni con elementi non forniti da lui o da un uso contrario al presente Contratto. Se una pretesa è avanzata o probabile, il Fornitore può ottenere il diritto di continuare l'uso, modificare i Servizi affinché non siano più in violazione, oppure cessarli e rimborsare i corrispettivi pagati in anticipo per i Servizi interessati.",
      },
    },
    payment: {
      name: "Condizioni di pagamento",
      notes: "Verificare le norme sugli interessi di mora e la formulazione fiscale (IVA/PPN, ritenute) per la giurisdizione.",
      variants: {
        "payment-bal": "Il Fornitore fattura i corrispettivi [mensilmente in anticipo]. Il Cliente paga ogni fattura non contestata entro [30] giorni dal ricevimento. I corrispettivi si intendono al netto di IVA e imposte analoghe, che il Cliente paga in aggiunta all'aliquota applicabile. Se il Cliente contesta una fattura in buona fede, ne informa il Fornitore entro [15] giorni indicandone i motivi e paga la parte non contestata. Gli importi scaduti producono interessi al [1]% mensile (o al tasso massimo consentito dalla legge, se inferiore) dalla scadenza fino al pagamento.",
        "payment-supplier": "Il Cliente paga tutte le fatture entro [14] giorni nella valuta fatturata, senza compensazioni o detrazioni. In caso di ritardo, il Fornitore può, previa diffida scritta di [7] giorni, sospendere i Servizi fino al ricevimento del pagamento e applicare interessi dell'[1,5]% mensile.",
      },
    },
    "term-renewal": {
      name: "Durata e rinnovo",
      notes: "Molte leggi a tutela dei consumatori e alcune norme B2B limitano il rinnovo tacito senza un avviso chiaro.",
      variants: {
        "term-bal": "Il presente Contratto decorre dalla Data di Efficacia e ha una durata iniziale di [12] mesi. Si rinnova poi per periodi successivi di [12] mesi salvo disdetta scritta di una delle parti almeno [60] giorni prima della scadenza del periodo in corso. Qualsiasi aumento dei corrispettivi al rinnovo non può superare il [5]% e deve essere comunicato almeno [90] giorni prima della data di rinnovo.",
        "term-customer": "Il presente Contratto ha durata di [12] mesi e cessa automaticamente alla scadenza, salvo che le parti concordino per iscritto di rinnovarlo.",
      },
    },
    termination: {
      name: "Recesso e risoluzione",
      notes: "Coordinare con la disciplina dell'insolvenza (alcune giurisdizioni limitano la risoluzione per il solo stato di insolvenza).",
      variants: {
        "termination-bal": "Ciascuna parte può risolvere il presente Contratto mediante comunicazione scritta se l'altra parte (a) commette un inadempimento grave a cui non pone rimedio entro [30] giorni dalla diffida scritta, o (b) diventa insolvente, è posta in liquidazione o conclude un accordo con i creditori, o cessa l'attività, nei limiti consentiti dalla legge. Il Cliente può inoltre recedere per convenienza con preavviso scritto di [90] giorni. Alla cessazione restano salvi i diritti maturati e continuano ad applicarsi le clausole destinate a sopravvivere (incluse riservatezza, responsabilità e pagamento dei corrispettivi maturati).",
      },
    },
    "governing-law": {
      name: "Legge applicabile",
      notes: "Scegliere una legge con cui si sa lavorare; le norme locali imperative (consumatori, lavoro, dati) possono comunque applicarsi.",
      variants: {
        "law-bal": "Il presente Contratto e ogni obbligazione extracontrattuale da esso derivante o ad esso connessa sono regolati dalla legge [della Repubblica di Indonesia / di Singapore / di Inghilterra e Galles].",
      },
    },
    arbitration: {
      name: "Risoluzione delle controversie — arbitrato",
      notes: "Usare la clausola modello dell'istituzione; verificare che la sede consenta l'esecuzione ai sensi della Convenzione di New York.",
      variants: {
        "arb-siac": "Qualsiasi controversia derivante dal o connessa al presente Contratto, comprese le questioni relative alla sua esistenza, validità o cessazione, sarà deferita e risolta in via definitiva mediante arbitrato amministrato dal [Singapore International Arbitration Centre (SIAC) / Badan Arbitrase Nasional Indonesia (BANI)] secondo il suo regolamento vigente. La sede dell'arbitrato è [Singapore / Giacarta]. Il tribunale arbitrale è composto da [uno / tre] arbitro/i. La lingua dell'arbitrato è [l'inglese / l'indonesiano].",
        "arb-escalation": "Le parti tentano anzitutto di risolvere ogni controversia mediante trattativa in buona fede tra dirigenti entro [30] giorni dalla comunicazione scritta della controversia, poi mediante mediazione secondo il regolamento di [istituzione], prima che una parte avvii un arbitrato o un giudizio, salvo provvedimenti cautelari urgenti.",
      },
    },
    courts: {
      name: "Risoluzione delle controversie — tribunali",
      notes: "Una clausola di foro esclusivo dà certezza; verificare il riconoscimento delle sentenze straniere dove si trovano i beni.",
      variants: {
        "courts-bal": "I tribunali di [Giacarta / Singapore / Inghilterra e Galles] hanno competenza esclusiva su qualsiasi controversia derivante dal o connessa al presente Contratto, e ciascuna parte si sottopone irrevocabilmente a tale giurisdizione.",
      },
    },
    "force-majeure": {
      name: "Forza maggiore",
      notes: "Elencare gli eventi con cura; prevedere un diritto di recesso in caso di forza maggiore prolungata.",
      variants: {
        "fm-bal": "Nessuna parte è inadempiente al presente Contratto né responsabile per ritardi o mancata esecuzione dei propri obblighi nella misura in cui siano causati da eventi al di fuori del suo ragionevole controllo, tra cui calamità naturali, epidemie, guerre, terrorismo, sommosse, provvedimenti delle autorità o interruzioni di reti o servizi pubblici (un \"Evento di Forza Maggiore\"), a condizione che ne informi tempestivamente l'altra parte e compia ragionevoli sforzi per mitigarne gli effetti. Gli obblighi di pagamento non sono esclusi. Se un Evento di Forza Maggiore impedisce l'esecuzione per più di [60] giorni consecutivi, ciascuna parte può risolvere il presente Contratto mediante comunicazione scritta.",
      },
    },
    assignment: {
      name: "Cessione e subappalto",
      notes: "Valutare separatamente le clausole di cambio di controllo.",
      variants: {
        "assign-bal": "Nessuna parte può cedere, trasferire o subappaltare i propri diritti od obblighi ai sensi del presente Contratto senza il previo consenso scritto dell'altra parte, che non può essere irragionevolmente negato; ciascuna parte può tuttavia cedere il presente Contratto a una società affiliata o al successore di tutta o sostanzialmente tutta la propria attività, previa comunicazione scritta. Ciascuna parte resta responsabile degli atti e delle omissioni dei propri subappaltatori.",
      },
    },
    "data-protection": {
      name: "Protezione dei dati (clausole per il responsabile)",
      notes: "L'art. 28 GDPR e la UU PDP richiedono clausole specifiche per il responsabile del trattamento — usare un DPA completo per trattamenti significativi.",
      variants: {
        "dp-bal": "Quando il Fornitore tratta dati personali per conto del Cliente, si impegna a: (a) trattarli solo su istruzioni documentate del Cliente; (b) garantire che le persone autorizzate al trattamento siano vincolate alla riservatezza; (c) adottare misure di sicurezza tecniche e organizzative adeguate; (d) non ricorrere a un altro responsabile senza la previa autorizzazione scritta del Cliente, imponendogli obblighi equivalenti; (e) assistere il Cliente nelle richieste degli interessati, nella sicurezza, nella notifica delle violazioni e nelle valutazioni d'impatto; (f) informare il Cliente senza ingiustificato ritardo, e comunque entro [48] ore, dopo essere venuto a conoscenza di una violazione dei dati personali; (g) cancellare o restituire tutti i dati personali al termine dei Servizi, salvo obbligo di conservazione per legge; e (h) mettere a disposizione le informazioni necessarie a dimostrare la conformità e consentire gli audit. I trasferimenti internazionali richiedono garanzie adeguate.",
      },
    },
    "ip-ownership": {
      name: "Titolarità della proprietà intellettuale",
      notes: "Distinguere la PI preesistente dai deliverable; alcune giurisdizioni richiedono una cessione scritta o una registrazione.",
      variants: {
        "ip-bal": "Ciascuna parte mantiene tutti i diritti di proprietà intellettuale di cui era titolare prima del presente Contratto o che sviluppa indipendentemente da esso. I diritti di proprietà intellettuale sui deliverable creati appositamente per il Cliente ai sensi del presente Contratto spettano al Cliente al pagamento integrale, ad eccezione dei materiali preesistenti del Fornitore in essi incorporati, per i quali il Fornitore concede al Cliente una licenza non esclusiva, perpetua e gratuita per utilizzarli come parte dei deliverable.",
        "ip-supplier": "Il Fornitore e i suoi licenzianti sono titolari di tutti i diritti di proprietà intellettuale sui Servizi, sul software e su tutti i relativi miglioramenti. Il Cliente è titolare dei propri dati. Il Fornitore concede al Cliente una licenza non esclusiva e non trasferibile per utilizzare i Servizi durante la durata del Contratto per le proprie finalità aziendali interne.",
      },
    },
    warranties: {
      name: "Garanzie",
      notes: "Le leggi a tutela dei consumatori possono prevedere garanzie non escludibili.",
      variants: {
        "warranty-bal": "Il Fornitore garantisce che i Servizi saranno prestati con ragionevole perizia e diligenza secondo le buone pratiche del settore e saranno sostanzialmente conformi alla documentazione. In caso di non conformità, il Fornitore, a sua scelta e a sue spese, elimina la non conformità o esegue nuovamente i Servizi entro un termine ragionevole; se non vi riesce, il Cliente può recedere dai Servizi interessati e ottenere il rimborso dei corrispettivi pagati in anticipo per essi. Salvo quanto espressamente previsto, ogni altra garanzia è esclusa nei limiti consentiti dalla legge.",
      },
    },
    sla: {
      name: "Livelli di servizio e crediti",
      notes: "Definire con precisione misurazione, esclusioni e procedura di reclamo.",
      variants: {
        "sla-bal": "Il Fornitore rende disponibili i Servizi per il [99,9]% del tempo in ciascun mese solare, esclusa la manutenzione programmata comunicata con almeno [48] ore di anticipo e gli eventi al di fuori del suo ragionevole controllo. Se la disponibilità scende sotto tale livello, il Cliente ha diritto a crediti di servizio pari al [5]% del canone mensile per ogni [0,5]% di scostamento, fino al [30]% del canone mensile, da richiedere entro [30] giorni. Se la disponibilità scende sotto il [99]% in [tre] mesi qualsiasi di un periodo mobile di [sei] mesi, il Cliente può recedere dai Servizi interessati senza penali.",
      },
    },
    audit: {
      name: "Diritti di audit",
      notes: "Bilanciare garanzie e costi; consentire l'affidamento su certificazioni indipendenti.",
      variants: {
        "audit-bal": "Con preavviso scritto di almeno [30] giorni e non più di una volta in un periodo di [12] mesi (salvo dopo un incidente di sicurezza o su richiesta di un'autorità), il Cliente o il suo revisore indipendente può verificare il rispetto del presente Contratto da parte del Fornitore durante il normale orario di lavoro, nel rispetto di ragionevoli requisiti di riservatezza e sicurezza. Il Fornitore può soddisfare le richieste di audit anzitutto fornendo certificazioni o report indipendenti in corso di validità (come ISO/IEC 27001 o SOC 2 Type II). Ciascuna parte sostiene i propri costi di audit, salvo che l'audit riveli una non conformità rilevante.",
      },
    },
    insurance: {
      name: "Assicurazione",
      notes: "Adeguare tipi e massimali di copertura ai rischi dei servizi.",
      variants: {
        "insurance-bal": "Per la durata del Contratto e per [un] anno successivo, il Fornitore mantiene presso assicuratori di buona reputazione: un'assicurazione di responsabilità civile professionale di almeno [importo] per sinistro, un'assicurazione di responsabilità civile verso terzi e prodotti di almeno [importo] e un'assicurazione per la responsabilità cyber di almeno [importo], fornendone prova su richiesta.",
      },
    },
    "anti-bribery": {
      name: "Anticorruzione e sanzioni",
      notes: "Richiamare le leggi effettivamente applicabili (es. UK Bribery Act, FCPA, D.Lgs. 231/2001, legge anticorruzione indonesiana).",
      variants: {
        "abc-bal": "Ciascuna parte rispetta tutte le leggi applicabili in materia di anticorruzione e sanzioni, non offre, dà, sollecita o accetta tangenti o pagamenti indebiti in relazione al presente Contratto e mantiene procedure adeguate per prevenire tali condotte da parte delle persone ad essa collegate. Ciascuna parte può risolvere il presente Contratto con effetto immediato mediante comunicazione scritta se l'altra parte viola la presente clausola.",
      },
    },
    "non-solicit": {
      name: "Divieto di storno di dipendenti",
      notes: "Mantenerlo breve e ragionevole; i tribunali possono non applicare restrizioni ampie.",
      variants: {
        "nonsolicit-bal": "Durante il Contratto e per [12] mesi dopo la sua cessazione, nessuna parte sollecita, direttamente o indirettamente, all'assunzione dipendenti dell'altra parte coinvolti in modo significativo nei Servizi, senza il previo consenso scritto dell'altra parte. Gli annunci di lavoro generici non rivolti a tali dipendenti non costituiscono violazione.",
      },
    },
    "non-compete": {
      name: "Patto di non concorrenza (lavoro)",
      notes: "La validità varia molto; alcune giurisdizioni richiedono un corrispettivo o vietano i patti di non concorrenza.",
      variants: {
        "noncompete-emp": "Per [6] mesi dalla cessazione del rapporto di lavoro, il Dipendente non può, in [territorio], essere assunto da un'impresa o prestare servizi a un'impresa in concorrenza con l'attività della Società in cui il Dipendente è stato coinvolto in modo significativo negli ultimi [12] mesi di lavoro, nella misura in cui tale restrizione sia ragionevole e valida ai sensi della legge applicabile. [Corrispettivo: la Società corrisponde [importo] al mese per il periodo di vincolo, se richiesto dalla legge.]",
      },
    },
    notices: {
      name: "Comunicazioni",
      notes: "Indicare quando le comunicazioni hanno effetto e se l'e-mail è sufficiente per le comunicazioni formali.",
      variants: {
        "notices-bal": "Ogni comunicazione ai sensi del presente Contratto deve essere fatta per iscritto e consegnata a mano, tramite corriere o via e-mail all'indirizzo indicato nel presente Contratto (o ad altro indirizzo comunicato per iscritto). Una comunicazione si intende ricevuta: se consegnata a mano o tramite corriere, al momento della consegna; se inviata via e-mail, al momento della trasmissione salvo che il mittente riceva un messaggio automatico di mancato recapito, fermo restando che le comunicazioni di inadempimento o di risoluzione inviate via e-mail sono inviate anche tramite corriere.",
      },
    },
    "entire-agreement": {
      name: "Intero accordo",
      notes: "Di norma non esclude la responsabilità per dichiarazioni fraudolente.",
      variants: {
        "entire-bal": "Il presente Contratto costituisce l'intero accordo tra le parti in relazione al suo oggetto e sostituisce tutti i precedenti accordi, intese e pattuizioni tra di esse. Ciascuna parte riconosce di non aver fatto affidamento su dichiarazioni, rappresentazioni o garanzie non contenute nel presente Contratto. Nulla nella presente clausola limita la responsabilità per frode.",
      },
    },
    severability: {
      name: "Clausola di salvaguardia, rinuncia ed esemplari",
      notes: "Clausole standard — verificare le formalità locali per la firma elettronica.",
      variants: {
        "boiler-bal": "Se una disposizione del presente Contratto risulta invalida o inapplicabile, essa è modificata nella misura minima necessaria per renderla valida, e il resto del presente Contratto rimane in vigore. Il mancato o ritardato esercizio di un diritto non costituisce rinuncia allo stesso. Il presente Contratto può essere sottoscritto in più esemplari e con firma elettronica, ciascuno dei quali costituisce un originale e tutti insieme un unico accordo.",
      },
    },
    language: {
      name: "Lingua (Indonesia)",
      notes: "La legge indonesiana n. 24 del 2009 richiede il bahasa indonesia per i contratti con parti indonesiane — verificare la normativa e la giurisprudenza attuali.",
      variants: {
        "language-id": "Il presente Contratto è redatto in lingua indonesiana e in lingua inglese. Entrambe le versioni fanno ugualmente fede. In caso di discordanza o di diversa interpretazione, prevale la versione [indonesiana / inglese], nei limiti consentiti dalla legge.",
      },
    },
  },
  rules: {
    "id-banding-perdata": { name: "Appello — causa civile (banding)", trigger: "Pronuncia o notifica della sentenza", note: "" },
    "id-kasasi-perdata": { name: "Ricorso per cassazione — causa civile (kasasi)", trigger: "Notifica della sentenza d'appello", note: "" },
    "id-pk": { name: "Revisione (peninjauan kembali)", trigger: "Sentenza definitiva / scoperta di nuove prove (novum)", note: "La decorrenza dipende dal motivo di revisione (Pasal 67)." },
    "id-verzet": { name: "Opposizione a sentenza contumaciale (verzet)", trigger: "Notifica della sentenza contumaciale", note: "" },
    "id-ptun": { name: "Ricorso al giudice amministrativo (gugatan TUN)", trigger: "Ricezione o pubblicazione del provvedimento amministrativo", note: "" },
    "id-pdp-breach": { name: "Notifica di violazione dei dati personali (UU PDP)", trigger: "Scoperta della violazione dei dati", note: "" },
    "id-daluwarsa-30": { name: "Prescrizione generale delle azioni civili (daluwarsa)", trigger: "Insorgenza del diritto di agire", note: "" },
    "us-answer": { name: "Comparsa di risposta (USA)", trigger: "Notifica della citazione e dell'atto introduttivo", note: "60 giorni se si è rinunciato alla notifica formale (Rule 12(a)(1)(A)(ii))." },
    "us-new-trial": { name: "Istanza di nuovo processo / modifica della sentenza (USA)", trigger: "Iscrizione della sentenza", note: "" },
    "us-appeal": { name: "Atto di appello civile (USA)", trigger: "Iscrizione della sentenza o dell'ordinanza", note: "60 giorni quando gli Stati Uniti sono parte (Rule 4(a)(1)(B))." },
    "gb-aos": { name: "Dichiarazione di ricevuta notifica (acknowledgment of service)", trigger: "Notifica delle particulars of claim", note: "" },
    "gb-defence": { name: "Difesa (dopo la dichiarazione di ricevuta)", trigger: "Notifica delle particulars of claim", note: "" },
    "gb-appeal": { name: "Atto di impugnazione (appellant's notice)", trigger: "Data della decisione", note: "Salvo che il giudice di grado inferiore fissi un termine diverso." },
    "gb-limitation-contract": { name: "Prescrizione — contratto semplice / illecito", trigger: "Insorgenza del diritto di azione", note: "" },
    "gb-limitation-pi": { name: "Prescrizione — lesioni personali", trigger: "Insorgenza o data di conoscenza", note: "" },
    "sg-limitation": { name: "Prescrizione — contratto / illecito", trigger: "Insorgenza del diritto di azione", note: "" },
    "eu-gdpr-breach": { name: "Notifica GDPR di una violazione all'autorità", trigger: "Il titolare viene a conoscenza della violazione", note: "" },
    "eu-gdpr-dsar": { name: "Richiesta dell'interessato (GDPR)", trigger: "Ricevimento della richiesta", note: "Prorogabile di altri due mesi per richieste complesse." },
    "eu-nis2-warning": { name: "Preallarme NIS2 per incidente significativo", trigger: "Conoscenza dell'incidente", note: "" },
  },
};
export default c;
