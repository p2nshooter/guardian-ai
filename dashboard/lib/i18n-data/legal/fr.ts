/* Legal AI catalogue — Français (see lib/legal/catalog.ts). Loaded only when the portal is in French. */
import type { LegalCatalog } from "@/lib/legal/catalog";

const c: LegalCatalog = {
  clauseTypes: {
    confidentiality: "Confidentialité",
    liability: "Limitation de responsabilité",
    indemnity: "Garantie d'indemnisation",
    termination: "Résiliation",
    "governing-law": "Droit applicable",
    disputes: "Règlement des litiges",
    ip: "Propriété intellectuelle",
    "data-protection": "Protection des données",
    payment: "Conditions de paiement",
    renewal: "Renouvellement",
    assignment: "Cession",
    "non-compete": "Non-concurrence",
    "non-solicit": "Non-sollicitation",
    warranty: "Garanties",
    "force-majeure": "Force majeure",
    audit: "Droit d'audit",
    insurance: "Assurance",
    sla: "Niveaux de service",
    term: "Durée",
    notice: "Notifications",
  },
  playbooks: {
    "nda-mutual": {
      name: "Accord de confidentialité réciproque (NDA)",
      side: "L'une ou l'autre partie",
      positions: [
        ["Obligations réciproques ; exclusions usuelles (information publique, déjà connue, développée de manière indépendante, reçue d'un tiers) ; communication limitée au strict besoin d'en connaître.", "Une protection unilatérale n'est acceptable que si nous sommes seuls à divulguer."],
        ["La confidentialité dure 2 à 5 ans après la divulgation (secrets d'affaires : tant qu'ils restent secrets).", "Jusqu'à 7 ans pour les informations très sensibles."],
        ["Pas de non-sollicitation dans un NDA ; si l'autre partie insiste, 12 mois maximum et salariés uniquement.", "12 mois, hors offres d'emploi générales."],
        ["Pas de non-concurrence dans un NDA.", "La supprimer."],
        ["La divulgation n'emporte aucune licence ni cession de propriété intellectuelle.", "—"],
        ["Notre droit et nos juridictions.", "Un droit neutre (p. ex. Angleterre et pays de Galles ou Singapour) avec arbitrage."],
      ],
    },
    "saas-customer": {
      name: "SaaS / services — nous sommes le client",
      side: "Client",
      positions: [
        ["Plafond du fournisseur ≥ 12 mois de redevances ; déplafonné (ou super-plafond) pour violation de données, confidentialité, garantie d'éviction PI, faute lourde et faute intentionnelle.", "Plafond ≥ 12 mois de redevances avec un super-plafond de 2 à 3× pour les violations de données."],
        ["Le fournisseur nous garantit contre les actions de tiers pour contrefaçon et contre les manquements au droit de la protection des données.", "Au minimum la garantie PI."],
        ["Paiement sous 30 à 60 jours après réception d'une facture conforme ; les montants contestés peuvent être retenus de bonne foi.", "30 jours."],
        ["Pas de reconduction tacite, ou reconduction avec préavis ≥ 30 jours et plafonnement des prix.", "Reconduction tacite avec préavis de résiliation de 60 jours et hausse de prix plafonnée à l'inflation (IPC) ou 5 %."],
        ["Résiliation pour convenance avec préavis de 30 à 90 jours ; pour manquement après un délai de régularisation de 30 jours.", "Pour manquement uniquement, avec remboursement au prorata des redevances payées d'avance."],
        ["Un accord de sous-traitance conforme à l'art. 28 RGPD / UU PDP ; notification des violations ≤ 48 heures ; liste des sous-traitants ultérieurs et information sur les changements ; restitution ou suppression des données à la fin.", "Notification des violations ≤ 72 heures."],
        ["Disponibilité ≥ 99,9 % avec crédits de service et droit de résiliation en cas de défaillance répétée.", "99,5 % avec crédits."],
        ["Aucune partie ne peut céder sans accord, sauf à une société affiliée ou à un successeur.", "Le fournisseur a besoin de notre accord ; nous pouvons céder à nos affiliées."],
        ["Notre droit et nos juridictions, ou un arbitrage dans un siège neutre.", "Droit neutre avec arbitrage (SIAC / ICC)."],
      ],
    },
    "saas-vendor": {
      name: "SaaS / services — nous sommes le fournisseur",
      side: "Fournisseur",
      positions: [
        ["Notre plafond = redevances payées au cours des 12 derniers mois ; aucune responsabilité pour les dommages indirects ou consécutifs ni le manque à gagner.", "Plafond jusqu'à 24 mois de redevances ; super-plafond violations de données ≤ 3×."],
        ["Services exécutés avec compétence et diligence raisonnables ; toutes autres garanties exclues dans la mesure permise par la loi.", "Ajouter une garantie de performance avec nouvelle exécution comme seul recours."],
        ["Paiement sous 30 jours ; intérêts de retard ; droit de suspendre après mise en demeure en cas d'impayé.", "45 jours."],
        ["Nous conservons toute la PI sur la plateforme ; le client est propriétaire de ses données ; licence limitée d'utilisation du service.", "Le client détient les livrables créés spécifiquement pour lui, nous conservons la PI préexistante."],
        ["Pas de résiliation pour convenance pendant la durée d'engagement ; pour manquement après un délai de régularisation de 30 jours.", "Résiliation pour convenance moyennant paiement des redevances restantes."],
        ["Audits au plus une fois par an, avec préavis de 30 jours, d'abord via nos certifications (SOC 2 / ISO 27001).", "Audit sur site uniquement après un incident documenté."],
      ],
    },
    "dpa-controller": {
      name: "Accord de traitement des données — nous sommes responsable du traitement",
      side: "Responsable du traitement",
      positions: [
        ["Traitement uniquement sur instruction documentée ; confidentialité du personnel ; mesures de sécurité ; accord pour les sous-traitants ultérieurs ; assistance pour les droits des personnes et les AIPD ; suppression ou restitution à la fin ; droit d'audit.", "Autorisation écrite générale pour les sous-traitants ultérieurs avec information et droit d'opposition."],
        ["Violation de données personnelles notifiée dans les meilleurs délais et sous 24 à 48 heures.", "Sous 72 heures — trop juste face à notre propre délai (72 heures RGPD / 3 × 24 heures UU PDP), donc obtenir plus rapide."],
        ["Droit d'auditer ou de recevoir des rapports d'audit de tiers.", "Rapports d'abord, audit sur site après un incident."],
        ["La responsabilité du sous-traitant pour ses manquements n'est pas limitée en deçà du plafond « violations de données » du contrat principal.", "Même plafond que le contrat principal."],
      ],
    },
    employment: {
      name: "Contrat de travail — nous sommes l'employeur",
      side: "Employeur",
      positions: [
        ["Confidentialité pendant et après le contrat de travail.", "—"],
        ["Tous les travaux réalisés dans le cadre de l'emploi appartiennent à l'employeur (sous réserve du droit local).", "—"],
        ["Seulement si elle est valable localement ; ≤ 12 mois, zone et fonctions limitées, avec contrepartie financière si la loi l'exige.", "S'appuyer plutôt sur la confidentialité et la non-sollicitation."],
        ["Préavis et motifs conformes aux minima légaux locaux.", "—"],
        ["Droit local du lieu de travail.", "—"],
      ],
    },
  },
  clauses: {
    confidentiality: {
      name: "Confidentialité",
      notes: "Vérifiez les exclusions et la durée de l'obligation ; les secrets d'affaires peuvent nécessiter une protection sans limite de durée.",
      variants: {
        "confidentiality-bal": "Chaque partie garde confidentielles toutes les Informations Confidentielles communiquées par l'autre partie et ne les utilise que pour exécuter le présent Contrat ou en bénéficier. Ne constituent pas des Informations Confidentielles les informations qui (a) sont ou deviennent publiques autrement que par une violation du présent Contrat, (b) étaient légitimement connues du destinataire avant leur communication, (c) ont été développées de manière indépendante sans utiliser les Informations Confidentielles, ou (d) ont été légitimement reçues d'un tiers non tenu à la confidentialité. Le destinataire peut communiquer les Informations Confidentielles à ses salariés et conseils qui ont besoin de les connaître et sont tenus à des obligations équivalentes, ou lorsque la loi l'exige, en avertissant rapidement l'autre partie lorsque cela est permis. Ces obligations demeurent pendant [3] ans après la fin du présent Contrat.",
        "confidentiality-short": "Chaque partie garde secrètes les informations confidentielles de l'autre, ne les utilise que pour le présent Contrat et ne les communique qu'aux personnes qui ont besoin de les connaître et sont tenues à des obligations équivalentes, sauf obligation légale. La présente clause survit [3] ans à la résiliation.",
      },
    },
    liability: {
      name: "Limitation de responsabilité",
      notes: "Le droit local peut interdire d'exclure la responsabilité en cas de décès, de dommage corporel, de fraude ou de faute lourde.",
      variants: {
        "liability-bal": "Aucune partie n'exclut ni ne limite sa responsabilité en cas de décès ou de dommage corporel causé par sa négligence, en cas de fraude, ou pour toute responsabilité qui ne peut être limitée par la loi. Sous cette réserve, aucune partie n'est responsable des dommages indirects ou consécutifs, ni de la perte de bénéfices, de chiffre d'affaires ou de clientèle. La responsabilité totale cumulée de chaque partie au titre ou à l'occasion du présent Contrat ne peut excéder le total des redevances payées et dues au titre du présent Contrat au cours des [12] mois précédant le fait générateur de la réclamation, étant précisé que la responsabilité pour manquement aux clauses de protection des données et de confidentialité ne peut excéder [3] fois ce montant.",
        "liability-supplier": "La responsabilité totale cumulée du Fournisseur au titre ou à l'occasion du présent Contrat, qu'elle soit contractuelle, délictuelle (y compris pour négligence) ou autre, ne peut excéder les redevances payées par le Client au cours des [12] mois précédant la réclamation. Le Fournisseur n'est pas responsable des pertes de données, de bénéfices, d'activité ou de clientèle, ni des dommages indirects ou consécutifs, dans toute la mesure permise par la loi.",
        "liability-customer": "La responsabilité totale cumulée du Fournisseur ne peut excéder [le plus élevé de [montant] et de [24] mois de redevances]. Les limites de la présente clause ne s'appliquent pas à la responsabilité du Fournisseur en cas de manquement à ses obligations de confidentialité ou de protection des données, au titre de ses garanties d'indemnisation, ou en cas de faute lourde ou intentionnelle.",
      },
    },
    indemnity: {
      name: "Garantie d'éviction (contrefaçon)",
      notes: "À associer à une procédure de conduite des réclamations ; envisager plafonds et exclusions.",
      variants: {
        "indemnity-bal": "Le Fournisseur défend le Client contre toute réclamation d'un tiers alléguant que les Services portent atteinte aux droits de propriété intellectuelle de ce tiers, et l'indemnise des dommages-intérêts et frais définitivement mis à sa charge ou convenus dans une transaction, à condition que le Client (a) informe rapidement le Fournisseur, (b) laisse au Fournisseur la direction de la défense et de la transaction, et (c) apporte une assistance raisonnable aux frais du Fournisseur. Le Fournisseur n'a aucune obligation pour les réclamations résultant de modifications qu'il n'a pas effectuées, de combinaisons avec des éléments qu'il n'a pas fournis, ou d'une utilisation contraire au présent Contrat. Si une réclamation est formée ou probable, le Fournisseur peut obtenir le droit de poursuivre l'utilisation, modifier les Services pour qu'ils ne soient plus contrefaisants, ou résilier et rembourser les redevances payées d'avance pour les Services concernés.",
      },
    },
    payment: {
      name: "Conditions de paiement",
      notes: "Vérifiez les règles sur les intérêts de retard et la rédaction fiscale (TVA/PPN, retenue à la source) dans la juridiction concernée.",
      variants: {
        "payment-bal": "Le Fournisseur facture les redevances [mensuellement d'avance]. Le Client paie chaque facture non contestée dans les [30] jours de sa réception. Les redevances s'entendent hors TVA et taxes similaires, que le Client paie en sus au taux applicable. Si le Client conteste une facture de bonne foi, il en informe le Fournisseur dans les [15] jours en motivant sa contestation et paie la partie non contestée. Les sommes impayées à l'échéance portent intérêt au taux de [1] % par mois (ou au taux légal maximal s'il est inférieur) de la date d'échéance jusqu'au paiement.",
        "payment-supplier": "Le Client paie toutes les factures dans les [14] jours, dans la devise facturée, sans compensation ni déduction. En cas de retard de paiement, le Fournisseur peut, après une mise en demeure écrite de [7] jours, suspendre les Services jusqu'à réception du paiement et appliquer des intérêts de [1,5] % par mois.",
      },
    },
    "term-renewal": {
      name: "Durée et renouvellement",
      notes: "De nombreuses lois de consommation et certaines règles B2B encadrent la reconduction tacite sans information claire.",
      variants: {
        "term-bal": "Le présent Contrat prend effet à la Date d'Effet pour une durée initiale de [12] mois. Il est ensuite reconduit pour des périodes successives de [12] mois, sauf dénonciation écrite par l'une des parties au moins [60] jours avant la fin de la période en cours. Toute hausse des redevances lors du renouvellement ne peut excéder [5] % et doit être notifiée au moins [90] jours avant la date de renouvellement.",
        "term-customer": "Le présent Contrat est conclu pour [12] mois et prend fin automatiquement à son terme, sauf accord écrit des parties pour le renouveler.",
      },
    },
    termination: {
      name: "Résiliation",
      notes: "À coordonner avec le droit des procédures collectives (certaines juridictions interdisent la résiliation du seul fait de l'insolvabilité).",
      variants: {
        "termination-bal": "Chaque partie peut résilier le présent Contrat par notification écrite si l'autre partie (a) commet un manquement grave auquel il n'est pas remédié dans les [30] jours suivant une mise en demeure écrite d'y remédier, ou (b) devient insolvable, entre en liquidation ou conclut un arrangement avec ses créanciers, ou cesse son activité, dans la mesure permise par la loi. Le Client peut également résilier pour convenance moyennant un préavis écrit de [90] jours. À la résiliation, les droits acquis sont préservés et les clauses destinées à survivre (notamment confidentialité, responsabilité et paiement des redevances échues) restent en vigueur.",
      },
    },
    "governing-law": {
      name: "Droit applicable",
      notes: "Choisissez un droit que vous maîtrisez ; les règles locales impératives (consommation, travail, données) peuvent néanmoins s'appliquer.",
      variants: {
        "law-bal": "Le présent Contrat et toute obligation non contractuelle découlant de celui-ci ou s'y rapportant sont régis par le droit [de la République d'Indonésie / de Singapour / de l'Angleterre et du pays de Galles].",
      },
    },
    arbitration: {
      name: "Règlement des litiges — arbitrage",
      notes: "Utilisez la clause type de l'institution ; vérifiez que le siège permet l'exécution au titre de la Convention de New York.",
      variants: {
        "arb-siac": "Tout litige découlant du présent Contrat ou s'y rapportant, y compris toute question relative à son existence, sa validité ou sa résiliation, sera soumis et définitivement tranché par voie d'arbitrage administré par le [Singapore International Arbitration Centre (SIAC) / Badan Arbitrase Nasional Indonesia (BANI)] conformément à son règlement en vigueur. Le siège de l'arbitrage est [Singapour / Jakarta]. Le tribunal arbitral est composé de [un / trois] arbitre(s). La langue de l'arbitrage est [l'anglais / l'indonésien].",
        "arb-escalation": "Les parties s'efforcent d'abord de résoudre tout litige par une négociation de bonne foi entre dirigeants dans les [30] jours suivant une notification écrite du litige, puis par une médiation selon le règlement de [institution], avant que l'une d'elles n'engage un arbitrage ou une procédure judiciaire, sauf mesures provisoires urgentes.",
      },
    },
    courts: {
      name: "Règlement des litiges — tribunaux",
      notes: "Une clause attributive de juridiction exclusive apporte de la sécurité ; vérifiez la reconnaissance des jugements étrangers là où se trouvent les actifs.",
      variants: {
        "courts-bal": "Les tribunaux de [Jakarta / Singapour / l'Angleterre et du pays de Galles] sont exclusivement compétents pour connaître de tout litige découlant du présent Contrat ou s'y rapportant, et chaque partie se soumet irrévocablement à cette compétence.",
      },
    },
    "force-majeure": {
      name: "Force majeure",
      notes: "Énumérez les événements avec soin ; prévoyez un droit de résiliation en cas de force majeure prolongée.",
      variants: {
        "fm-bal": "Aucune partie n'est en manquement au présent Contrat ni responsable d'un retard ou d'une inexécution de ses obligations dans la mesure où ceux-ci résultent d'événements échappant à son contrôle raisonnable, notamment catastrophes naturelles, épidémies, guerre, terrorisme, émeutes, fait du prince, ou défaillance des réseaux ou services publics (un « Cas de Force Majeure »), à condition d'en informer rapidement l'autre partie et de faire des efforts raisonnables pour en atténuer les effets. Les obligations de paiement ne sont pas suspendues. Si un Cas de Force Majeure empêche l'exécution pendant plus de [60] jours consécutifs, chaque partie peut résilier le présent Contrat par notification écrite.",
      },
    },
    assignment: {
      name: "Cession et sous-traitance",
      notes: "Traitez séparément les clauses de changement de contrôle.",
      variants: {
        "assign-bal": "Aucune partie ne peut céder, transférer ou sous-traiter ses droits ou obligations au titre du présent Contrat sans l'accord écrit préalable de l'autre partie, qui ne peut être refusé sans motif raisonnable ; toutefois, chaque partie peut céder le présent Contrat à une société affiliée ou au successeur de tout ou partie substantielle de son activité moyennant notification écrite. Chaque partie demeure responsable des actes et omissions de ses sous-traitants.",
      },
    },
    "data-protection": {
      name: "Protection des données (clauses de sous-traitance)",
      notes: "L'art. 28 du RGPD et l'UU PDP imposent des clauses spécifiques — utilisez un accord de sous-traitance complet pour tout traitement significatif.",
      variants: {
        "dp-bal": "Lorsque le Fournisseur traite des données personnelles pour le compte du Client, il s'engage à : (a) ne les traiter que sur instruction documentée du Client ; (b) veiller à ce que les personnes autorisées à les traiter soient soumises à la confidentialité ; (c) mettre en œuvre des mesures de sécurité techniques et organisationnelles appropriées ; (d) ne pas recourir à un autre sous-traitant sans l'autorisation écrite préalable du Client, et lui imposer des obligations équivalentes ; (e) aider le Client à répondre aux demandes des personnes concernées et en matière de sécurité, de notification des violations et d'analyses d'impact ; (f) notifier le Client dans les meilleurs délais, et en tout état de cause dans les [48] heures, après avoir pris connaissance d'une violation de données personnelles ; (g) supprimer ou restituer toutes les données personnelles à la fin des Services, sauf obligation légale de conservation ; et (h) mettre à disposition les informations nécessaires pour démontrer sa conformité et permettre des audits. Les transferts internationaux exigent des garanties appropriées.",
      },
    },
    "ip-ownership": {
      name: "Propriété intellectuelle",
      notes: "Distinguez la PI préexistante des livrables ; certaines juridictions exigent une cession écrite ou un enregistrement.",
      variants: {
        "ip-bal": "Chaque partie conserve tous les droits de propriété intellectuelle qu'elle détenait avant le présent Contrat ou qu'elle développe indépendamment de celui-ci. Les droits de propriété intellectuelle sur les livrables créés spécifiquement pour le Client au titre du présent Contrat lui sont acquis au paiement intégral, à l'exception des éléments préexistants du Fournisseur qui y sont intégrés, pour lesquels le Fournisseur concède au Client une licence non exclusive, perpétuelle et gratuite d'utilisation en tant que partie des livrables.",
        "ip-supplier": "Le Fournisseur et ses concédants détiennent tous les droits de propriété intellectuelle sur les Services, le logiciel et toutes leurs améliorations. Le Client est propriétaire de ses données. Le Fournisseur concède au Client une licence non exclusive et non cessible d'utilisation des Services pendant la durée du Contrat pour ses besoins professionnels internes.",
      },
    },
    warranties: {
      name: "Garanties",
      notes: "Le droit de la consommation peut imposer des garanties qui ne peuvent être exclues.",
      variants: {
        "warranty-bal": "Le Fournisseur garantit que les Services seront exécutés avec compétence et diligence raisonnables conformément aux bonnes pratiques du secteur et seront conformes pour l'essentiel à la documentation. En cas de non-conformité, le Fournisseur, à son choix et à ses frais, corrige la non-conformité ou exécute à nouveau les Services dans un délai raisonnable ; à défaut, le Client peut résilier les Services concernés et obtenir le remboursement des redevances payées d'avance à ce titre. Sauf stipulation expresse, toutes autres garanties sont exclues dans la mesure permise par la loi.",
      },
    },
    sla: {
      name: "Niveaux de service et crédits",
      notes: "Définissez précisément la mesure, les exclusions et la procédure de réclamation.",
      variants: {
        "sla-bal": "Le Fournisseur rend les Services disponibles [99,9] % du temps chaque mois civil, hors maintenance programmée notifiée au moins [48] heures à l'avance et événements échappant à son contrôle raisonnable. Si la disponibilité est inférieure à ce niveau, le Client a droit à des crédits de service de [5] % de la redevance mensuelle par tranche de [0,5] % d'écart, dans la limite de [30] % de la redevance mensuelle, à réclamer dans les [30] jours. Si la disponibilité est inférieure à [99] % pendant [trois] mois sur une période glissante de [six] mois, le Client peut résilier les Services concernés sans pénalité.",
      },
    },
    audit: {
      name: "Droit d'audit",
      notes: "Équilibrez assurance et coût ; autorisez le recours à des certifications indépendantes.",
      variants: {
        "audit-bal": "Moyennant un préavis écrit d'au moins [30] jours et au plus une fois par période de [12] mois (sauf après un incident de sécurité ou à la demande d'une autorité), le Client ou son auditeur indépendant peut auditer le respect du présent Contrat par le Fournisseur pendant les heures ouvrables, sous réserve d'exigences raisonnables de confidentialité et de sécurité. Le Fournisseur peut d'abord répondre aux demandes d'audit en fournissant des certifications ou rapports indépendants en cours de validité (tels qu'ISO/IEC 27001 ou SOC 2 Type II). Chaque partie supporte ses propres frais d'audit, sauf si l'audit révèle un manquement significatif.",
      },
    },
    insurance: {
      name: "Assurance",
      notes: "Adaptez les types et montants de couverture aux risques des services.",
      variants: {
        "insurance-bal": "Pendant la durée du Contrat et [un] an après, le Fournisseur maintient auprès d'assureurs réputés : une assurance responsabilité civile professionnelle d'au moins [montant] par sinistre, une assurance responsabilité civile générale et produits d'au moins [montant], et une assurance cyber-risques d'au moins [montant], et en justifie sur demande.",
      },
    },
    "anti-bribery": {
      name: "Lutte anticorruption et sanctions",
      notes: "Visez les lois réellement applicables (p. ex. UK Bribery Act, FCPA, loi Sapin II, droit indonésien anticorruption).",
      variants: {
        "abc-bal": "Chaque partie respecte l'ensemble des lois applicables en matière de lutte contre la corruption et de sanctions, s'interdit d'offrir, de donner, de solliciter ou d'accepter tout pot-de-vin ou paiement indu en lien avec le présent Contrat, et maintient des procédures adéquates pour prévenir de tels agissements par les personnes qui lui sont associées. Chaque partie peut résilier le présent Contrat avec effet immédiat par notification écrite si l'autre partie viole la présente clause.",
      },
    },
    "non-solicit": {
      name: "Non-sollicitation du personnel",
      notes: "Restez bref et raisonnable ; les tribunaux peuvent refuser d'appliquer des restrictions trop larges.",
      variants: {
        "nonsolicit-bal": "Pendant la durée du Contrat et [12] mois après, aucune partie ne sollicite directement ou indirectement, en vue de l'embaucher, un salarié de l'autre partie ayant participé de manière significative aux Services, sans l'accord écrit préalable de l'autre partie. Les offres d'emploi générales qui ne ciblent pas ces salariés ne constituent pas une violation.",
      },
    },
    "non-compete": {
      name: "Non-concurrence (travail)",
      notes: "La validité varie fortement ; certaines juridictions exigent une contrepartie financière ou interdisent les clauses de non-concurrence.",
      variants: {
        "noncompete-emp": "Pendant [6] mois après la fin du contrat de travail, le Salarié s'interdit, sur [territoire], d'être employé par une entreprise ou de fournir des services à une entreprise concurrente de l'activité de la Société à laquelle le Salarié a participé de manière significative au cours des [12] derniers mois de son emploi, dans la mesure où cette restriction est raisonnable et valable au regard du droit applicable. [Contrepartie : la Société verse [montant] par mois pendant la période d'interdiction, si la loi l'exige.]",
      },
    },
    notices: {
      name: "Notifications",
      notes: "Précisez quand les notifications prennent effet et si l'e-mail suffit pour les notifications formelles.",
      variants: {
        "notices-bal": "Toute notification au titre du présent Contrat est faite par écrit et remise en main propre, par coursier ou par e-mail à l'adresse indiquée dans le présent Contrat (ou à toute autre adresse notifiée par écrit). Une notification est réputée reçue : en cas de remise en main propre ou par coursier, à la livraison ; en cas d'envoi par e-mail, au moment de la transmission sauf si l'expéditeur reçoit un message automatique d'échec, étant précisé que les notifications de manquement ou de résiliation envoyées par e-mail sont également adressées par coursier.",
      },
    },
    "entire-agreement": {
      name: "Intégralité de l'accord",
      notes: "N'exclut normalement pas la responsabilité pour déclaration frauduleuse.",
      variants: {
        "entire-bal": "Le présent Contrat constitue l'intégralité de l'accord des parties sur son objet et remplace tous accords, arrangements et ententes antérieurs entre elles. Chaque partie reconnaît ne s'être fondée sur aucune déclaration, affirmation ou garantie qui ne figure pas dans le présent Contrat. Rien dans la présente clause ne limite la responsabilité en cas de fraude.",
      },
    },
    severability: {
      name: "Divisibilité, renonciation et exemplaires",
      notes: "Clauses usuelles — vérifiez les formalités locales applicables à la signature électronique.",
      variants: {
        "boiler-bal": "Si une stipulation du présent Contrat est jugée nulle ou inapplicable, elle est modifiée dans la mesure minimale nécessaire pour la rendre valable, et le reste du présent Contrat demeure en vigueur. Le fait de ne pas exercer ou de tarder à exercer un droit ne vaut pas renonciation à ce droit. Le présent Contrat peut être signé en plusieurs exemplaires et par signature électronique, chacun constituant un original et tous ensemble un seul et même contrat.",
      },
    },
    language: {
      name: "Langue (Indonésie)",
      notes: "La loi indonésienne n° 24 de 2009 impose le bahasa indonesia pour les contrats impliquant des parties indonésiennes — vérifiez les règles et la jurisprudence actuelles.",
      variants: {
        "language-id": "Le présent Contrat est établi en langues indonésienne et anglaise. Les deux versions font également foi. En cas de divergence ou d'interprétation différente, la version [indonésienne / anglaise] prévaut, dans la mesure permise par la loi.",
      },
    },
  },
  rules: {
    "id-banding-perdata": { name: "Appel — affaire civile (banding)", trigger: "Prononcé ou signification du jugement", note: "" },
    "id-kasasi-perdata": { name: "Pourvoi en cassation — affaire civile (kasasi)", trigger: "Signification de l'arrêt d'appel", note: "" },
    "id-pk": { name: "Révision (peninjauan kembali)", trigger: "Décision définitive / découverte d'un élément nouveau (novum)", note: "Le point de départ dépend du motif de révision (Pasal 67)." },
    "id-verzet": { name: "Opposition à un jugement par défaut (verzet)", trigger: "Signification du jugement par défaut", note: "" },
    "id-ptun": { name: "Recours devant le juge administratif (gugatan TUN)", trigger: "Réception ou publication de la décision administrative", note: "" },
    "id-pdp-breach": { name: "Notification d'une violation de données personnelles (UU PDP)", trigger: "Découverte de la défaillance de protection des données", note: "" },
    "id-daluwarsa-30": { name: "Prescription générale des actions civiles (daluwarsa)", trigger: "Naissance du droit d'agir", note: "" },
    "us-answer": { name: "Réponse à la plainte (États-Unis)", trigger: "Signification de l'assignation et de la plainte", note: "60 jours en cas de renonciation à la signification (Rule 12(a)(1)(A)(ii))." },
    "us-new-trial": { name: "Requête en nouveau procès / modification du jugement (États-Unis)", trigger: "Enregistrement du jugement", note: "" },
    "us-appeal": { name: "Déclaration d'appel civil (États-Unis)", trigger: "Enregistrement du jugement ou de l'ordonnance", note: "60 jours lorsque les États-Unis sont partie (Rule 4(a)(1)(B))." },
    "gb-aos": { name: "Accusé de signification (acknowledgment of service)", trigger: "Signification des conclusions de la demande", note: "" },
    "gb-defence": { name: "Défense (accusé de signification déposé)", trigger: "Signification des conclusions de la demande", note: "" },
    "gb-appeal": { name: "Déclaration d'appel (appellant's notice)", trigger: "Date de la décision", note: "Sauf si la juridiction inférieure fixe un autre délai." },
    "gb-limitation-contract": { name: "Prescription — contrat simple / responsabilité délictuelle", trigger: "Naissance de la cause d'action", note: "" },
    "gb-limitation-pi": { name: "Prescription — dommage corporel", trigger: "Naissance de l'action ou date de connaissance", note: "" },
    "sg-limitation": { name: "Prescription — contrat / responsabilité délictuelle", trigger: "Naissance de la cause d'action", note: "" },
    "eu-gdpr-breach": { name: "Notification RGPD d'une violation à l'autorité", trigger: "Prise de connaissance de la violation par le responsable du traitement", note: "" },
    "eu-gdpr-dsar": { name: "Demande d'une personne concernée (RGPD)", trigger: "Réception de la demande", note: "Prolongeable de deux mois pour les demandes complexes." },
    "eu-nis2-warning": { name: "Alerte précoce NIS2 en cas d'incident important", trigger: "Prise de connaissance de l'incident", note: "" },
  },
};
export default c;
