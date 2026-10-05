/* Legal AI catalogue — Deutsch (see lib/legal/catalog.ts). Loaded only when the portal is in German. */
import type { LegalCatalog } from "@/lib/legal/catalog";

const c: LegalCatalog = {
  clauseTypes: {
    confidentiality: "Vertraulichkeit",
    liability: "Haftungsbeschränkung",
    indemnity: "Freistellung",
    termination: "Kündigung",
    "governing-law": "Anwendbares Recht",
    disputes: "Streitbeilegung",
    ip: "Geistiges Eigentum",
    "data-protection": "Datenschutz",
    payment: "Zahlungsbedingungen",
    renewal: "Verlängerung",
    assignment: "Abtretung",
    "non-compete": "Wettbewerbsverbot",
    "non-solicit": "Abwerbeverbot",
    warranty: "Gewährleistung",
    "force-majeure": "Höhere Gewalt",
    audit: "Auditrechte",
    insurance: "Versicherung",
    sla: "Service-Level",
    term: "Laufzeit",
    notice: "Mitteilungen",
  },
  playbooks: {
    "nda-mutual": {
      name: "Gegenseitige Geheimhaltungsvereinbarung (NDA)",
      side: "Beide Parteien",
      positions: [
        ["Gegenseitige Pflichten; übliche Ausnahmen (öffentlich bekannt, bereits bekannt, unabhängig entwickelt, von Dritten erhalten); Weitergabe nur nach dem Need-to-know-Prinzip.", "Einseitiger Schutz nur akzeptabel, wenn ausschließlich wir Informationen offenlegen."],
        ["Vertraulichkeit gilt 2–5 Jahre nach der Offenlegung (Geschäftsgeheimnisse: solange sie geheim sind).", "Bis zu 7 Jahre für hochsensible Informationen."],
        ["Kein Abwerbeverbot in einem NDA; besteht die Gegenseite darauf, höchstens 12 Monate und nur für Mitarbeiter.", "12 Monate, ausgenommen allgemeine Stellenanzeigen."],
        ["Kein Wettbewerbsverbot in einem NDA.", "Streichen."],
        ["Die Offenlegung begründet keine Lizenz und keine Übertragung von geistigem Eigentum.", "—"],
        ["Unser Heimatrecht und unsere Gerichte.", "Ein neutrales Recht (z. B. England & Wales oder Singapur) mit Schiedsverfahren."],
      ],
    },
    "saas-customer": {
      name: "SaaS / Dienstleistungen — wir sind Kunde",
      side: "Kunde",
      positions: [
        ["Haftungshöchstbetrag des Anbieters ≥ 12 Monatsentgelte; unbegrenzt (oder erhöhte Obergrenze) bei Datenschutzverletzungen, Vertraulichkeit, IP-Freistellung, grober Fahrlässigkeit und Vorsatz.", "Obergrenze ≥ 12 Monatsentgelte mit 2–3-facher Sonderobergrenze für Datenschutzverletzungen."],
        ["Der Anbieter stellt uns von Ansprüchen Dritter wegen IP-Verletzung und Verstößen gegen Datenschutzrecht frei.", "Mindestens IP-Freistellung."],
        ["Zahlung innerhalb von 30–60 Tagen nach ordnungsgemäßer Rechnung; strittige Beträge dürfen in gutem Glauben zurückbehalten werden.", "30 Tage."],
        ["Keine automatische Verlängerung oder Verlängerung mit ≥ 30 Tagen Kündigungsfrist und Preisobergrenze.", "Automatische Verlängerung mit 60 Tagen Kündigungsfrist und Preiserhöhung begrenzt auf Inflationsrate (VPI) oder 5 %."],
        ["Ordentliche Kündigung mit 30–90 Tagen Frist; außerordentliche Kündigung nach 30-tägiger Abhilfefrist.", "Nur aus wichtigem Grund, mit anteiliger Erstattung vorausbezahlter Entgelte."],
        ["AVV gemäß Art. 28 DSGVO / UU PDP; Meldung von Verletzungen ≤ 48 Stunden; Liste der Unterauftragsverarbeiter und Mitteilung von Änderungen; Rückgabe oder Löschung der Daten am Ende.", "Meldung von Verletzungen ≤ 72 Stunden."],
        ["Verfügbarkeit ≥ 99,9 % mit Servicegutschriften und Kündigungsrecht bei wiederholtem Ausfall.", "99,5 % mit Gutschriften."],
        ["Keine Partei darf ohne Zustimmung abtreten, außer an verbundene Unternehmen oder Rechtsnachfolger.", "Der Anbieter benötigt unsere Zustimmung; wir dürfen an verbundene Unternehmen abtreten."],
        ["Unser Heimatrecht und unsere Gerichte oder ein Schiedsverfahren an einem neutralen Ort.", "Neutrales Recht mit Schiedsverfahren (SIAC / ICC)."],
      ],
    },
    "saas-vendor": {
      name: "SaaS / Dienstleistungen — wir sind Anbieter",
      side: "Anbieter",
      positions: [
        ["Unsere Haftungsobergrenze = in den letzten 12 Monaten gezahlte Entgelte; keine Haftung für indirekte Schäden, Folgeschäden oder entgangenen Gewinn.", "Obergrenze bis zu 24 Monatsentgelten; Sonderobergrenze für Datenschutzverletzungen ≤ 3×."],
        ["Leistungserbringung mit angemessener Sorgfalt und Fachkunde; alle weiteren Gewährleistungen ausgeschlossen, soweit gesetzlich zulässig.", "Leistungsgarantie mit Nacherfüllung als einzigem Rechtsbehelf ergänzen."],
        ["Zahlung innerhalb von 30 Tagen; Verzugszinsen; Recht zur Leistungsaussetzung nach Mahnung bei Nichtzahlung.", "45 Tage."],
        ["Wir behalten alle Rechte an der Plattform; der Kunde ist Eigentümer seiner Daten; beschränkte Lizenz zur Nutzung des Dienstes.", "Der Kunde erhält die eigens für ihn erstellten Arbeitsergebnisse, wir behalten vorbestehendes geistiges Eigentum."],
        ["Keine ordentliche Kündigung während der Mindestlaufzeit; außerordentliche Kündigung nach 30-tägiger Abhilfefrist.", "Ordentliche Kündigung gegen Zahlung der restlichen Entgelte."],
        ["Audits höchstens einmal jährlich, mit 30 Tagen Vorankündigung, zunächst über unsere Zertifizierungen (SOC 2 / ISO 27001).", "Vor-Ort-Audit nur nach einem dokumentierten Vorfall."],
      ],
    },
    "dpa-controller": {
      name: "Auftragsverarbeitungsvertrag — wir sind Verantwortlicher",
      side: "Verantwortlicher",
      positions: [
        ["Verarbeitung nur auf dokumentierte Weisung; Vertraulichkeit des Personals; Sicherheitsmaßnahmen; Zustimmung zu Unterauftragsverarbeitern; Unterstützung bei Betroffenenrechten und DSFA; Löschung oder Rückgabe am Ende; Auditrechte.", "Allgemeine schriftliche Genehmigung für Unterauftragsverarbeiter mit Mitteilung und Widerspruchsrecht."],
        ["Verletzungen des Schutzes personenbezogener Daten unverzüglich und innerhalb von 24–48 Stunden melden.", "Innerhalb von 72 Stunden — knapp gegenüber unserer eigenen Frist (72 Stunden DSGVO / 3 × 24 Stunden UU PDP), daher auf schnellere Meldung drängen."],
        ["Recht auf Audit oder auf Prüfberichte Dritter.", "Zuerst Berichte, Vor-Ort-Audit nach einem Vorfall."],
        ["Die Haftung des Auftragsverarbeiters für eigene Verstöße wird nicht unter die Obergrenze für Datenschutzverletzungen des Hauptvertrags begrenzt.", "Gleiche Obergrenze wie im Hauptvertrag."],
      ],
    },
    employment: {
      name: "Arbeitsvertrag — wir sind Arbeitgeber",
      side: "Arbeitgeber",
      positions: [
        ["Vertraulichkeit während und nach dem Arbeitsverhältnis.", "—"],
        ["Alle im Rahmen des Arbeitsverhältnisses geschaffenen Arbeitsergebnisse stehen dem Arbeitgeber zu (vorbehaltlich des örtlichen Rechts).", "—"],
        ["Nur soweit örtlich durchsetzbar; ≤ 12 Monate, räumlich und fachlich begrenzt, mit Karenzentschädigung, wenn gesetzlich vorgeschrieben.", "Stattdessen auf Vertraulichkeit und Abwerbeverbot setzen."],
        ["Kündigungsfristen und -gründe, die den gesetzlichen Mindestanforderungen vor Ort entsprechen.", "—"],
        ["Örtliches Recht des Arbeitsorts.", "—"],
      ],
    },
  },
  clauses: {
    confidentiality: {
      name: "Vertraulichkeit",
      notes: "Ausnahmen und Fortgeltungsdauer prüfen; Geschäftsgeheimnisse benötigen ggf. unbefristeten Schutz.",
      variants: {
        "confidentiality-bal": "Jede Partei hält alle von der anderen Partei offengelegten Vertraulichen Informationen geheim und verwendet sie ausschließlich zur Erfüllung dieses Vertrags oder zur Inanspruchnahme seiner Vorteile. Vertrauliche Informationen umfassen keine Informationen, die (a) öffentlich bekannt sind oder werden, ohne dass dieser Vertrag verletzt wurde, (b) dem Empfänger vor der Offenlegung rechtmäßig bekannt waren, (c) ohne Nutzung der Vertraulichen Informationen unabhängig entwickelt wurden oder (d) rechtmäßig von einem Dritten ohne Geheimhaltungspflicht erhalten wurden. Der Empfänger darf Vertrauliche Informationen an seine Mitarbeiter und Berater weitergeben, die sie kennen müssen und gleichwertigen Pflichten unterliegen, oder soweit gesetzlich vorgeschrieben, wobei er die andere Partei, soweit zulässig, unverzüglich benachrichtigt. Diese Pflichten gelten für [3] Jahre nach Beendigung dieses Vertrags fort.",
        "confidentiality-short": "Jede Partei hält die vertraulichen Informationen der anderen geheim, verwendet sie nur für diesen Vertrag und gibt sie nur an Personen weiter, die sie kennen müssen und gleichwertigen Pflichten unterliegen, es sei denn, das Gesetz verlangt etwas anderes. Diese Klausel gilt nach Vertragsbeendigung für [3] Jahre fort.",
      },
    },
    liability: {
      name: "Haftungsbeschränkung",
      notes: "Das örtliche Recht erlaubt oft keinen Haftungsausschluss für Tod, Körperverletzung, Betrug oder grobe Fahrlässigkeit.",
      variants: {
        "liability-bal": "Keine Partei schließt ihre Haftung für durch Fahrlässigkeit verursachten Tod oder Körperverletzung, für Betrug oder für eine gesetzlich nicht beschränkbare Haftung aus oder beschränkt sie. Vorbehaltlich dessen haftet keine Partei für indirekte Schäden oder Folgeschäden oder für entgangenen Gewinn, Umsatz oder Goodwill. Die Gesamthaftung jeder Partei aus oder im Zusammenhang mit diesem Vertrag übersteigt nicht die Gesamtheit der im Rahmen dieses Vertrags in den [12] Monaten vor dem anspruchsbegründenden Ereignis gezahlten und zu zahlenden Entgelte; die Haftung für Verletzungen der Datenschutz- und Vertraulichkeitsklauseln übersteigt nicht das [3]-fache dieses Betrags.",
        "liability-supplier": "Die Gesamthaftung des Anbieters aus oder im Zusammenhang mit diesem Vertrag, ob aus Vertrag, unerlaubter Handlung (einschließlich Fahrlässigkeit) oder anderweitig, übersteigt nicht die vom Kunden in den [12] Monaten vor dem Anspruch gezahlten Entgelte. Der Anbieter haftet, soweit gesetzlich zulässig, nicht für Datenverlust, entgangenen Gewinn, Geschäftsverlust oder Verlust an Goodwill oder für indirekte Schäden oder Folgeschäden.",
        "liability-customer": "Die Gesamthaftung des Anbieters übersteigt nicht [den höheren Betrag von [Betrag] und [24] Monatsentgelten]. Die Beschränkungen dieser Klausel gelten nicht für die Haftung des Anbieters wegen Verletzung von Vertraulichkeits- oder Datenschutzpflichten, für seine Freistellungen sowie für grobe Fahrlässigkeit oder Vorsatz.",
      },
    },
    indemnity: {
      name: "Freistellung (IP-Verletzung)",
      notes: "Mit einem Verfahren zur Anspruchsabwehr kombinieren; Obergrenzen und Ausnahmen bedenken.",
      variants: {
        "indemnity-bal": "Der Anbieter verteidigt den Kunden gegen Ansprüche Dritter, die Leistungen verletzten deren Rechte des geistigen Eigentums, und stellt den Kunden von rechtskräftig zuerkannten oder vergleichsweise vereinbarten Schadensersatzbeträgen und Kosten frei, sofern der Kunde (a) den Anbieter unverzüglich benachrichtigt, (b) dem Anbieter die Führung der Verteidigung und der Vergleichsverhandlungen überlässt und (c) auf Kosten des Anbieters angemessen mitwirkt. Der Anbieter ist nicht verpflichtet bei Ansprüchen, die auf nicht von ihm vorgenommenen Änderungen, auf Kombinationen mit nicht von ihm gelieferten Gegenständen oder auf vertragswidriger Nutzung beruhen. Wird ein Anspruch erhoben oder ist er wahrscheinlich, kann der Anbieter das Recht zur weiteren Nutzung beschaffen, die Leistungen so ändern, dass sie nicht mehr verletzen, oder die betroffenen Leistungen beenden und vorausbezahlte Entgelte dafür erstatten.",
      },
    },
    payment: {
      name: "Zahlungsbedingungen",
      notes: "Regeln zu Verzugszinsen und Steuerformulierungen (USt/PPN, Quellensteuer) für die jeweilige Rechtsordnung prüfen.",
      variants: {
        "payment-bal": "Der Anbieter stellt die Entgelte [monatlich im Voraus] in Rechnung. Der Kunde zahlt jede unbestrittene Rechnung innerhalb von [30] Tagen nach Erhalt. Die Entgelte verstehen sich zuzüglich Umsatzsteuer und ähnlicher Steuern, die der Kunde zusätzlich zum geltenden Satz zahlt. Bestreitet der Kunde eine Rechnung in gutem Glauben, teilt er dies dem Anbieter innerhalb von [15] Tagen mit Begründung mit und zahlt den unbestrittenen Teil. Verspätete Beträge werden ab Fälligkeit bis zur Zahlung mit [1] % pro Monat verzinst (oder mit dem gesetzlich höchstzulässigen Satz, falls niedriger).",
        "payment-supplier": "Der Kunde zahlt alle Rechnungen innerhalb von [14] Tagen in der Rechnungswährung ohne Aufrechnung oder Abzug. Ist ein Betrag überfällig, kann der Anbieter nach schriftlicher Ankündigung mit einer Frist von [7] Tagen die Leistungen bis zum Zahlungseingang aussetzen und Zinsen von [1,5] % pro Monat berechnen.",
      },
    },
    "term-renewal": {
      name: "Laufzeit und Verlängerung",
      notes: "Viele Verbraucherschutz- und einige B2B-Gesetze beschränken automatische Verlängerungen ohne klaren Hinweis.",
      variants: {
        "term-bal": "Dieser Vertrag beginnt am Tag des Inkrafttretens und läuft für eine anfängliche Laufzeit von [12] Monaten. Danach verlängert er sich um jeweils [12] Monate, sofern nicht eine Partei mindestens [60] Tage vor Ende der laufenden Laufzeit schriftlich kündigt. Eine Entgelterhöhung bei Verlängerung darf [5] % nicht übersteigen und ist mindestens [90] Tage vor dem Verlängerungsdatum mitzuteilen.",
        "term-customer": "Dieser Vertrag läuft [12] Monate und endet dann automatisch, sofern die Parteien nicht schriftlich eine Verlängerung vereinbaren.",
      },
    },
    termination: {
      name: "Kündigung",
      notes: "Mit dem Insolvenzrecht abstimmen (manche Rechtsordnungen beschränken insolvenzbedingte Lösungsklauseln).",
      variants: {
        "termination-bal": "Jede Partei kann diesen Vertrag durch schriftliche Mitteilung kündigen, wenn die andere Partei (a) eine wesentliche Pflichtverletzung begeht, die nicht innerhalb von [30] Tagen nach schriftlicher Aufforderung zur Abhilfe behoben wird, oder (b) zahlungsunfähig wird, in Liquidation geht oder einen Vergleich mit ihren Gläubigern schließt oder ihren Geschäftsbetrieb einstellt, soweit gesetzlich zulässig. Der Kunde kann zudem ordentlich mit einer Frist von [90] Tagen schriftlich kündigen. Bei Beendigung bleiben entstandene Rechte unberührt, und Klauseln, die ihrer Natur nach fortgelten sollen (einschließlich Vertraulichkeit, Haftung und Zahlung entstandener Entgelte), bleiben in Kraft.",
      },
    },
    "governing-law": {
      name: "Anwendbares Recht",
      notes: "Ein Recht wählen, mit dem Sie arbeiten können; zwingende örtliche Vorschriften (Verbraucher, Arbeit, Daten) können dennoch gelten.",
      variants: {
        "law-bal": "Dieser Vertrag und alle außervertraglichen Schuldverhältnisse aus oder im Zusammenhang mit ihm unterliegen dem Recht [der Republik Indonesien / Singapurs / von England und Wales].",
      },
    },
    arbitration: {
      name: "Streitbeilegung — Schiedsverfahren",
      notes: "Die Musterklausel der Institution verwenden; prüfen, ob der Schiedsort die Vollstreckung nach dem New Yorker Übereinkommen ermöglicht.",
      variants: {
        "arb-siac": "Alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag, einschließlich Fragen zu seinem Bestehen, seiner Wirksamkeit oder Beendigung, werden durch ein Schiedsverfahren endgültig entschieden, das vom [Singapore International Arbitration Centre (SIAC) / Badan Arbitrase Nasional Indonesia (BANI)] nach seiner jeweils geltenden Schiedsordnung administriert wird. Schiedsort ist [Singapur / Jakarta]. Das Schiedsgericht besteht aus [einem / drei] Schiedsrichter(n). Die Verfahrenssprache ist [Englisch / Indonesisch].",
        "arb-escalation": "Die Parteien versuchen zunächst, jede Streitigkeit innerhalb von [30] Tagen nach schriftlicher Streitanzeige durch Verhandlungen in gutem Glauben zwischen leitenden Managern beizulegen, sodann durch Mediation nach den Regeln von [Institution], bevor eine Partei ein Schieds- oder Gerichtsverfahren einleitet; ausgenommen ist dringender einstweiliger Rechtsschutz.",
      },
    },
    courts: {
      name: "Streitbeilegung — Gerichte",
      notes: "Eine ausschließliche Gerichtsstandsklausel schafft Sicherheit; die Anerkennung ausländischer Urteile am Ort des Vermögens prüfen.",
      variants: {
        "courts-bal": "Die Gerichte von [Jakarta / Singapur / England und Wales] sind ausschließlich zuständig für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag, und jede Partei unterwirft sich unwiderruflich dieser Zuständigkeit.",
      },
    },
    "force-majeure": {
      name: "Höhere Gewalt",
      notes: "Ereignisse sorgfältig auflisten; ein Kündigungsrecht nach längerer höherer Gewalt aufnehmen.",
      variants: {
        "fm-bal": "Keine Partei verletzt diesen Vertrag oder haftet für Verzögerungen oder Nichterfüllung ihrer Pflichten, soweit diese durch Ereignisse außerhalb ihrer zumutbaren Kontrolle verursacht werden, darunter Naturkatastrophen, Epidemien, Krieg, Terrorismus, Unruhen, behördliche Maßnahmen oder Ausfall öffentlicher Versorgungs- oder Kommunikationsnetze (ein \"Ereignis Höherer Gewalt\"), sofern sie die andere Partei unverzüglich benachrichtigt und angemessene Anstrengungen zur Minderung der Folgen unternimmt. Zahlungspflichten bleiben unberührt. Verhindert ein Ereignis Höherer Gewalt die Erfüllung für mehr als [60] aufeinanderfolgende Tage, kann jede Partei diesen Vertrag schriftlich kündigen.",
      },
    },
    assignment: {
      name: "Abtretung und Unterbeauftragung",
      notes: "Kontrollwechselklauseln gesondert betrachten.",
      variants: {
        "assign-bal": "Keine Partei darf ihre Rechte oder Pflichten aus diesem Vertrag ohne vorherige schriftliche Zustimmung der anderen Partei, die nicht unbillig verweigert werden darf, abtreten, übertragen oder an Unterauftragnehmer vergeben; jede Partei darf diesen Vertrag jedoch durch schriftliche Mitteilung an ein verbundenes Unternehmen oder an einen Rechtsnachfolger ihres gesamten oder im Wesentlichen gesamten Geschäfts abtreten. Eine Partei bleibt für Handlungen und Unterlassungen ihrer Unterauftragnehmer verantwortlich.",
      },
    },
    "data-protection": {
      name: "Datenschutz (Auftragsverarbeitung)",
      notes: "Art. 28 DSGVO und UU PDP verlangen bestimmte Klauseln für Auftragsverarbeiter — bei erheblicher Verarbeitung einen vollständigen AVV verwenden.",
      variants: {
        "dp-bal": "Verarbeitet der Anbieter personenbezogene Daten im Auftrag des Kunden, wird er: (a) sie nur auf dokumentierte Weisung des Kunden verarbeiten; (b) sicherstellen, dass die zur Verarbeitung befugten Personen zur Vertraulichkeit verpflichtet sind; (c) geeignete technische und organisatorische Sicherheitsmaßnahmen umsetzen; (d) keinen weiteren Auftragsverarbeiter ohne vorherige schriftliche Genehmigung des Kunden einsetzen und diesem gleichwertige Pflichten auferlegen; (e) den Kunden bei Betroffenenanfragen, Sicherheit, Meldung von Verletzungen und Datenschutz-Folgenabschätzungen unterstützen; (f) den Kunden unverzüglich, in jedem Fall innerhalb von [48] Stunden, nach Kenntnis einer Verletzung des Schutzes personenbezogener Daten benachrichtigen; (g) alle personenbezogenen Daten am Ende der Leistungen löschen oder zurückgeben, sofern keine gesetzliche Aufbewahrungspflicht besteht; und (h) alle Informationen zum Nachweis der Einhaltung bereitstellen und Audits ermöglichen. Internationale Übermittlungen erfordern geeignete Garantien.",
      },
    },
    "ip-ownership": {
      name: "Rechte am geistigen Eigentum",
      notes: "Vorbestehendes geistiges Eigentum von Arbeitsergebnissen unterscheiden; manche Rechtsordnungen verlangen eine schriftliche Übertragung oder Registrierung.",
      variants: {
        "ip-bal": "Jede Partei behält alle Rechte des geistigen Eigentums, die ihr vor diesem Vertrag zustanden oder die sie unabhängig davon entwickelt. Die Rechte des geistigen Eigentums an den eigens für den Kunden im Rahmen dieses Vertrags erstellten Arbeitsergebnissen gehen mit vollständiger Bezahlung auf den Kunden über, ausgenommen darin enthaltene vorbestehende Materialien des Anbieters, für die der Anbieter dem Kunden eine nicht ausschließliche, unbefristete und lizenzgebührenfreie Lizenz zur Nutzung als Teil der Arbeitsergebnisse einräumt.",
        "ip-supplier": "Der Anbieter und seine Lizenzgeber sind Inhaber aller Rechte des geistigen Eigentums an den Leistungen, der Software und allen Verbesserungen daran. Der Kunde ist Eigentümer seiner Daten. Der Anbieter räumt dem Kunden eine nicht ausschließliche, nicht übertragbare Lizenz zur Nutzung der Leistungen während der Laufzeit für interne Geschäftszwecke ein.",
      },
    },
    warranties: {
      name: "Gewährleistung",
      notes: "Verbraucherschutzgesetze können Gewährleistungen vorsehen, die nicht ausgeschlossen werden können.",
      variants: {
        "warranty-bal": "Der Anbieter gewährleistet, dass die Leistungen mit angemessener Sorgfalt und Fachkunde nach guter Branchenpraxis erbracht werden und im Wesentlichen der Dokumentation entsprechen. Entsprechen die Leistungen dem nicht, wird der Anbieter nach seiner Wahl und auf seine Kosten den Mangel beheben oder die Leistungen innerhalb angemessener Frist erneut erbringen; gelingt dies nicht, kann der Kunde die betroffenen Leistungen kündigen und erhält die dafür vorausbezahlten Entgelte zurück. Soweit nicht ausdrücklich angegeben, sind alle weiteren Gewährleistungen im gesetzlich zulässigen Umfang ausgeschlossen.",
      },
    },
    sla: {
      name: "Service-Level und Gutschriften",
      notes: "Messung, Ausnahmen und Anspruchsverfahren genau festlegen.",
      variants: {
        "sla-bal": "Der Anbieter stellt die Leistungen in jedem Kalendermonat zu [99,9] % der Zeit bereit, ausgenommen geplante Wartungen, die mindestens [48] Stunden im Voraus angekündigt werden, und Ereignisse außerhalb seiner zumutbaren Kontrolle. Fällt die Verfügbarkeit darunter, erhält der Kunde Servicegutschriften von [5] % des Monatsentgelts je [0,5] % Unterschreitung, höchstens [30] % des Monatsentgelts, geltend zu machen innerhalb von [30] Tagen. Liegt die Verfügbarkeit in [drei] Monaten innerhalb eines rollierenden Zeitraums von [sechs] Monaten unter [99] %, kann der Kunde die betroffenen Leistungen ohne Vertragsstrafe kündigen.",
      },
    },
    audit: {
      name: "Auditrechte",
      notes: "Sicherheit und Kosten abwägen; die Berufung auf unabhängige Zertifizierungen zulassen.",
      variants: {
        "audit-bal": "Mit einer schriftlichen Ankündigung von mindestens [30] Tagen und höchstens einmal in einem Zeitraum von [12] Monaten (außer nach einem Sicherheitsvorfall oder auf Anforderung einer Aufsichtsbehörde) kann der Kunde oder sein unabhängiger Prüfer die Einhaltung dieses Vertrags durch den Anbieter während der üblichen Geschäftszeiten prüfen, vorbehaltlich angemessener Vertraulichkeits- und Sicherheitsanforderungen. Der Anbieter kann Auditanfragen zunächst durch Vorlage aktueller unabhängiger Zertifizierungen oder Berichte (etwa ISO/IEC 27001 oder SOC 2 Type II) erfüllen. Jede Partei trägt ihre eigenen Auditkosten, es sei denn, das Audit deckt wesentliche Verstöße auf.",
      },
    },
    insurance: {
      name: "Versicherung",
      notes: "Deckungsarten und -summen an die Risiken der Leistungen anpassen.",
      variants: {
        "insurance-bal": "Während der Laufzeit und für [ein] Jahr danach unterhält der Anbieter bei angesehenen Versicherern: eine Berufshaftpflichtversicherung von mindestens [Betrag] je Schadensfall, eine Betriebs- und Produkthaftpflichtversicherung von mindestens [Betrag] und eine Cyber-Haftpflichtversicherung von mindestens [Betrag], und weist den Versicherungsschutz auf Anfrage nach.",
      },
    },
    "anti-bribery": {
      name: "Korruptionsbekämpfung und Sanktionen",
      notes: "Auf die tatsächlich anwendbaren Gesetze verweisen (z. B. UK Bribery Act, FCPA, §§ 299 ff. StGB, indonesisches Antikorruptionsrecht).",
      variants: {
        "abc-bal": "Jede Partei hält alle anwendbaren Gesetze zur Bekämpfung von Bestechung und Korruption sowie Sanktionsvorschriften ein, bietet im Zusammenhang mit diesem Vertrag keine Bestechungsgelder oder unzulässigen Zahlungen an, gewährt, fordert oder nimmt sie nicht an und unterhält angemessene Verfahren, um solches Verhalten durch mit ihr verbundene Personen zu verhindern. Jede Partei kann diesen Vertrag durch schriftliche Mitteilung fristlos kündigen, wenn die andere Partei gegen diese Klausel verstößt.",
      },
    },
    "non-solicit": {
      name: "Abwerbeverbot für Mitarbeiter",
      notes: "Kurz und angemessen halten; Gerichte setzen weitreichende Beschränkungen möglicherweise nicht durch.",
      variants: {
        "nonsolicit-bal": "Während der Laufzeit und für [12] Monate danach wird keine Partei ohne vorherige schriftliche Zustimmung der anderen Partei direkt oder indirekt Mitarbeiter der anderen Partei abwerben, die wesentlich an den Leistungen beteiligt waren. Allgemeine Stellenanzeigen, die sich nicht gezielt an diese Mitarbeiter richten, sind kein Verstoß.",
      },
    },
    "non-compete": {
      name: "Wettbewerbsverbot (Arbeitsverhältnis)",
      notes: "Die Durchsetzbarkeit ist sehr unterschiedlich; manche Rechtsordnungen verlangen eine Entschädigung oder verbieten Wettbewerbsverbote.",
      variants: {
        "noncompete-emp": "Für [6] Monate nach Beendigung des Arbeitsverhältnisses wird der Arbeitnehmer innerhalb von [Gebiet] weder bei einem Unternehmen angestellt sein noch für ein Unternehmen Leistungen erbringen, das mit dem Geschäftsbereich der Gesellschaft im Wettbewerb steht, in dem der Arbeitnehmer in den letzten [12] Monaten des Arbeitsverhältnisses wesentlich tätig war, soweit diese Beschränkung angemessen und nach anwendbarem Recht durchsetzbar ist. [Karenzentschädigung: Die Gesellschaft zahlt während des Beschränkungszeitraums [Betrag] pro Monat, sofern gesetzlich vorgeschrieben.]",
      },
    },
    notices: {
      name: "Mitteilungen",
      notes: "Festlegen, wann Mitteilungen wirksam werden und ob E-Mail für förmliche Mitteilungen genügt.",
      variants: {
        "notices-bal": "Mitteilungen nach diesem Vertrag bedürfen der Schriftform und werden persönlich, per Kurier oder per E-Mail an die in diesem Vertrag angegebene (oder eine schriftlich mitgeteilte andere) Adresse zugestellt. Eine Mitteilung gilt als zugegangen: bei persönlicher Übergabe oder Kurier mit der Zustellung; bei E-Mail zum Zeitpunkt der Übermittlung, sofern der Absender keine automatische Fehlermeldung erhält, wobei per E-Mail versandte Mitteilungen über Vertragsverletzungen oder Kündigungen zusätzlich per Kurier zu versenden sind.",
      },
    },
    "entire-agreement": {
      name: "Vollständigkeitsklausel",
      notes: "Schließt die Haftung für arglistige Täuschung in der Regel nicht aus.",
      variants: {
        "entire-bal": "Dieser Vertrag enthält die gesamte Vereinbarung der Parteien über seinen Gegenstand und ersetzt alle früheren Vereinbarungen, Absprachen und Verständigungen zwischen ihnen. Jede Partei erkennt an, dass sie sich auf keine Erklärung, Zusicherung oder Gewährleistung verlassen hat, die nicht in diesem Vertrag enthalten ist. Diese Klausel beschränkt nicht die Haftung für Betrug.",
      },
    },
    severability: {
      name: "Salvatorische Klausel, Verzicht und Ausfertigungen",
      notes: "Standardklauseln — örtliche Formvorschriften für elektronische Signaturen prüfen.",
      variants: {
        "boiler-bal": "Erweist sich eine Bestimmung dieses Vertrags als unwirksam oder undurchführbar, wird sie im geringstmöglichen Umfang angepasst, um sie wirksam zu machen; der übrige Vertrag bleibt in Kraft. Die Nichtausübung oder verspätete Ausübung eines Rechts gilt nicht als Verzicht darauf. Dieser Vertrag kann in mehreren Ausfertigungen und durch elektronische Signatur unterzeichnet werden; jede Ausfertigung gilt als Original, und alle zusammen bilden einen Vertrag.",
      },
    },
    language: {
      name: "Vertragssprache (Indonesien)",
      notes: "Das indonesische Gesetz Nr. 24/2009 verlangt Bahasa Indonesia für Verträge mit indonesischen Parteien — aktuelle Vorschriften und Rechtsprechung prüfen.",
      variants: {
        "language-id": "Dieser Vertrag wird in indonesischer und englischer Sprache geschlossen. Beide Fassungen sind gleichermaßen verbindlich. Bei Widersprüchen oder unterschiedlicher Auslegung ist, soweit gesetzlich zulässig, die [indonesische / englische] Fassung maßgeblich.",
      },
    },
  },
  rules: {
    "id-banding-perdata": { name: "Berufung — Zivilsache (banding)", trigger: "Verkündung oder Zustellung des Urteils", note: "" },
    "id-kasasi-perdata": { name: "Kassation — Zivilsache (kasasi)", trigger: "Zustellung des Berufungsurteils", note: "" },
    "id-pk": { name: "Wiederaufnahme (peninjauan kembali)", trigger: "Rechtskraft des Urteils / Auffinden neuer Beweise (novum)", note: "Der Fristbeginn hängt vom Wiederaufnahmegrund ab (Pasal 67)." },
    "id-verzet": { name: "Einspruch gegen Versäumnisurteil (verzet)", trigger: "Zustellung des Versäumnisurteils", note: "" },
    "id-ptun": { name: "Verwaltungsgerichtliche Klage (gugatan TUN)", trigger: "Zugang oder Bekanntgabe des Verwaltungsakts", note: "" },
    "id-pdp-breach": { name: "Meldung einer Verletzung personenbezogener Daten (UU PDP)", trigger: "Kenntnis der Datenschutzverletzung", note: "" },
    "id-daluwarsa-30": { name: "Allgemeine Verjährung zivilrechtlicher Ansprüche (daluwarsa)", trigger: "Entstehung des Anspruchs", note: "" },
    "us-answer": { name: "Klageerwiderung (USA)", trigger: "Zustellung von Ladung und Klageschrift", note: "60 Tage bei Verzicht auf förmliche Zustellung (Rule 12(a)(1)(A)(ii))." },
    "us-new-trial": { name: "Antrag auf neue Verhandlung / Urteilsänderung (USA)", trigger: "Eintragung des Urteils", note: "" },
    "us-appeal": { name: "Berufungsanzeige in Zivilsachen (USA)", trigger: "Eintragung des Urteils oder Beschlusses", note: "60 Tage, wenn die Vereinigten Staaten Partei sind (Rule 4(a)(1)(B))." },
    "gb-aos": { name: "Zustellungsbestätigung (acknowledgment of service)", trigger: "Zustellung der Klagebegründung", note: "" },
    "gb-defence": { name: "Klageerwiderung (nach Zustellungsbestätigung)", trigger: "Zustellung der Klagebegründung", note: "" },
    "gb-appeal": { name: "Rechtsmittelschrift (appellant's notice)", trigger: "Datum der Entscheidung", note: "Sofern das untere Gericht keine andere Frist bestimmt." },
    "gb-limitation-contract": { name: "Verjährung — einfacher Vertrag / Delikt", trigger: "Entstehung des Klagegrunds", note: "" },
    "gb-limitation-pi": { name: "Verjährung — Personenschaden", trigger: "Entstehung oder Kenntnisdatum", note: "" },
    "sg-limitation": { name: "Verjährung — Vertrag / Delikt", trigger: "Entstehung des Klagegrunds", note: "" },
    "eu-gdpr-breach": { name: "DSGVO-Meldung einer Datenschutzverletzung an die Behörde", trigger: "Verantwortlicher erlangt Kenntnis von der Verletzung", note: "" },
    "eu-gdpr-dsar": { name: "DSGVO-Betroffenenanfrage", trigger: "Eingang der Anfrage", note: "Bei komplexen Anfragen um zwei weitere Monate verlängerbar." },
    "eu-nis2-warning": { name: "NIS2-Frühwarnung bei erheblichem Sicherheitsvorfall", trigger: "Kenntnis des Vorfalls", note: "" },
  },
};
export default c;
