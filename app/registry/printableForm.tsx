"use client";

import { useI18n } from "@/app/i18n/localeProvider";
import {
  citizenshipTypeIdOptions,
  relationshipTypeOptions,
  occupationTypeOptions,
  documentTypeOptions,
} from "@/components/registry/blocks";

type Data = Record<string, string | boolean>;
type Tr = (en: string, sw: string) => string;

/** Look up a label from a { value, label } options array. */
function optionLabel(
  options: { value: string; label: string }[],
  value: string,
): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

export default function PrintableForm({
  data,
  applicationId,
  submittedDate,
}: {
  data: Data;
  applicationId: string;
  submittedDate: string;
}) {
  const { locale, t } = useI18n();
  // The printed form is rendered purely in the active language — never mixed.
  const tr: Tr = (en, sw) => (locale === "sw" ? sw : en);

  // Locale-aware lookup option lists, built once per render.
  const CITIZENSHIP_TYPE_ID_OPTIONS = citizenshipTypeIdOptions(t);
  const RELATIONSHIP_TYPE_OPTIONS = relationshipTypeOptions(t);
  const OCCUPATION_TYPE_OPTIONS = occupationTypeOptions(t);
  const DOCUMENT_TYPE_OPTIONS = documentTypeOptions(t);

  const s = (key: string) => {
    const v = data[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const val = (key: string) => s(key) || "—";
  const fullName = (prefix: string) =>
    [s(`${prefix}First`), s(`${prefix}Middle`), s(`${prefix}Last`)]
      .filter(Boolean)
      .join(" ") || "—";

  /** Compose an address string from the given prefix's cascade fields. */
  const addressCascade = (prefix: string) =>
    [
      s(`${prefix}Ward`),
      s(`${prefix}District`),
      s(`${prefix}Region`),
      s(`${prefix}Country`),
    ]
      .filter(Boolean)
      .join(", ") || "—";

  const genderMap: Record<string, string> = {
    M: tr("Male", "Mwanaume"),
    F: tr("Female", "Mwanamke"),
    O: tr("Other", "Nyingine"),
  };
  const gender = s("gender") ? (genderMap[s("gender")] ?? s("gender")) : "—";
  const applicantName = fullName("applicant");

  // Citizenship type
  const citizenshipType = optionLabel(CITIZENSHIP_TYPE_ID_OPTIONS, s("citizenshipTypeId"));

  // Attachments
  const attachmentNames = (() => {
    const raw = s("attachments");
    if (!raw) return "—";
    try {
      const parsed = JSON.parse(raw) as { name?: string }[];
      const names = Array.isArray(parsed)
        ? parsed.map((x) => x?.name).filter((n): n is string => !!n && n.trim() !== "")
        : [];
      return names.length > 0 ? names.join(", ") : "—";
    } catch {
      return "—";
    }
  })();

  // Education — multiple schools
  const neverAttendedSchool = data.neverAttendedSchool === true;
  const schoolCount = Math.max(1, Number(data.eduCount) || 1);

  // Emergency contacts — new ec1/ec2 prefix
  const ecName = (prefix: string) => fullName(prefix);

  // Family
  const hasChildren = data.hasChildren === true;
  const isMarried = data.isMarried === true;
  const relativeCount = Math.max(2, Number(data.relativeCount) || 2);
  const spouseCount = Math.max(1, Number(data.spouseCount) || 1);

  return (
    <div id="printable-form">
      <header>
        <div className="header-row">
          <img
            className="header-logo"
            src="/logo/immigrationEmblem.png"
            alt="Immigration Services Department emblem"
          />
          <div className="header-center">
            <p className="title-lg">
              {tr("The United Republic of Tanzania", "Jamhuri ya Muungano wa Tanzania")}
            </p>
            <p className="title-md">
              {tr("Ministry of Home Affairs", "Wizara ya Mambo ya Ndani")}
            </p>
            <p className="title-md">
              {tr("Immigration Services Department", "Idara ya Uhamiaji")}
            </p>
            <p className="title-gold">
              {tr("Civil Registration Application Form", "Fomu ya Maombi ya Usajili wa Raia")}
            </p>
          </div>
          <div className="header-right">
            <p className="form-code">Fomu TIF24</p>
            {s("passportPhotoData") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="applicant-photo"
                src={s("passportPhotoData")}
                alt="Applicant passport photo"
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="app-id-banner">
        <span>{tr("Application ID", "Namba ya Maombi")}: {applicationId}</span>
      </div>

      {/* ─── Section 1: Personal Information ─── */}
      <Section title={tr("1. Personal Information:", "1. Taarifa Binafsi:")}>
        <Row label={tr("Full Name", "Jina Kamili")} value={applicantName} />
        <Row label={tr("Gender", "Jinsia")} value={gender} />
        <Row label={tr("Date of Birth", "Tarehe ya Kuzaliwa")} value={val("dob")} />
        <Row label={tr("Citizenship Type", "Aina ya Uraia")} value={citizenshipType || "—"} />
        <Row label={tr("Nationality", "Utaifa")} value={val("nationalityCountry")} />
        <Row label={tr("Country of Birth", "Nchi ya Kuzaliwa")} value={val("pobCountry")} />
        <Row label={tr("Region", "Mkoa")} value={val("pobRegion")} />
        <Row label={tr("District", "Wilaya")} value={val("pobDistrict")} />
        <Row label={tr("Ward", "Kata")} value={val("pobWard")} />
        <Row label={tr("Village / Street", "Kijiji / Mtaa")} value={val("pobVillage")} />
        <Row label={tr("Birth Certificate No.", "Namba ya Cheti cha Kuzaliwa")} value={val("birthCertNo")} />
        <Row label={tr("Marital Status", "Hali ya Ndoa")} value={val("marriage")} />
        <Row label={tr("Phone Number", "Namba ya Simu")} value={val("phone")} />
        <Row label={tr("Email Address", "Barua Pepe")} value={val("email")} />

        {/* Naturalization details (if applicable) */}
        {s("citizenshipTypeId") === "3" && (
          <>
            <SubTitle>{tr("Naturalization Details", "Taarifa za Urithi wa Uraia")}</SubTitle>
            <Row label={tr("Certificate Number", "Namba ya Cheti")} value={val("naturalizationCertNo")} />
            <Row label={tr("Issue Place", "Sehemu ya Kutolewa")} value={val("naturalizationPlace")} />
            <Row label={tr("Issue Date", "Tarehe ya Kutolewa")} value={val("naturalizationDate")} />
          </>
        )}
      </Section>

      {/* ─── Section 2: Residence / Address ─── */}
      <Section title={tr("2. Residence Information:", "2. Taarifa za Makazi:")}>
        <SubTitle>{tr("Current Address", "Anuani ya Sasa")}</SubTitle>
        <Row label={tr("Country", "Nchi")} value={val("curCountry")} />
        <Row label={tr("Region", "Mkoa")} value={val("curRegion")} />
        <Row label={tr("District", "Wilaya")} value={val("curDistrict")} />
        <Row label={tr("Ward", "Kata")} value={val("curWard")} />
        <Row label={tr("House No. / Street", "Nyumba Na. / Mtaa")} value={val("curHouseNumber")} />
        <Row label={tr("Postal Code", "Msimbo wa Posta")} value={val("curPostalCode")} />

        <SubTitle>{tr("Permanent Address", "Anuani ya Kudumu")}</SubTitle>
        {data.sameAsPerm === true ? (
          <Row
            label={tr("Same as current address", "Sawa na anuani ya sasa")}
            value={tr("Yes", "Ndiyo")}
          />
        ) : (
          <>
            <Row label={tr("Country", "Nchi")} value={val("permCountry")} />
            <Row label={tr("Region", "Mkoa")} value={val("permRegion")} />
            <Row label={tr("District", "Wilaya")} value={val("permDistrict")} />
            <Row label={tr("Ward", "Kata")} value={val("permWard")} />
            <Row label={tr("House No. / Street", "Nyumba Na. / Mtaa")} value={val("permHouseNumber")} />
            <Row label={tr("Postal Code", "Msimbo wa Posta")} value={val("permPostalCode")} />
          </>
        )}
      </Section>

      {/* ─── Section 3: Parents Information ─── */}
      <Section title={tr("3. Parents Information:", "3. Taarifa za Wazazi:")}>
        <ParentPrintBlock prefix="father" label={tr("Father", "Baba")} tr={tr} t={t} s={s} val={val} />
        <ParentPrintBlock prefix="mother" label={tr("Mother", "Mama")} tr={tr} t={t} s={s} val={val} />
      </Section>

      {/* ─── Section 4: Education & Employment ─── */}
      <Section title={tr("4. Education & Employment:", "4. Elimu na Ajira:")}>
        <SubTitle>{tr("Education", "Elimu")}</SubTitle>
        {neverAttendedSchool ? (
          <Row
            label={tr("Education", "Elimu")}
            value={tr("Never attended school", "Sijawahi kwenda shule")}
          />
        ) : (
          Array.from({ length: schoolCount }, (_, i) => i + 1)
            .filter((n) => s(`edu${n}School`))
            .map((n) => (
              <div key={n}>
                <SubTitle>{`${tr("School", "Shule")} ${n}`}</SubTitle>
                <Row label={tr("Education Level", "Kiwango cha Elimu")} value={val(`edu${n}Level`)} />
                <Row label={tr("School / Institution", "Shule / Taasisi")} value={val(`edu${n}School`)} />
                <Row label={tr("Completion Year", "Mwaka wa Kuhitimu")} value={val(`edu${n}Year`)} />
                <Row label={tr("School District", "Wilaya ya Shule")} value={val(`edu${n}District`)} />
                <Row label={tr("Index / Reg. No.", "Namba ya Usajili")} value={val(`edu${n}IndexNo`)} />
              </div>
            ))
        )}

        <SubTitle>{tr("Employment", "Ajira")}</SubTitle>
        <Row label={tr("Employment Status", "Hali ya Ajira")} value={val("jobStatus")} />
        <Row label={tr("Occupation", "Kazi")} value={optionLabel(OCCUPATION_TYPE_OPTIONS, s("occupation")) || "—"} />
        <Row label={tr("Employer / Organisation", "Mwajiri / Taasisi")} value={val("employer")} />
        <Row label={tr("National ID (NIDA)", "Namba ya NIDA")} value={val("nidaNumber")} />
      </Section>

      {/* ─── Section 5: Emergency Contacts ─── */}
      <Section title={tr("5. Emergency Contacts:", "5. Watu wa Kuwasiliana Wakati wa Dharura:")}>
        <EmergencyPrintBlock prefix="ec1" index={1} tr={tr} t={t} s={s} val={val} />
        <EmergencyPrintBlock prefix="ec2" index={2} tr={tr} t={t} s={s} val={val} />
      </Section>

      {/* ─── Section 6: Family ─── */}
      <Section title={tr("6. Family Information:", "6. Taarifa za Familia:")}>
        <Row
          label={tr("Has Children", "Ana Watoto")}
          value={hasChildren ? tr("Yes", "Ndiyo") : tr("No", "Hapana")}
        />
        <Row
          label={tr("Currently Married", "Ameoa/Ameolewa")}
          value={isMarried ? tr("Yes", "Ndiyo") : tr("No", "Hapana")}
        />

        {isMarried &&
          Array.from({ length: spouseCount }, (_, i) => i + 1)
            .filter((n) => s(`sp${n}First`))
            .map((n) => (
              <div key={`sp${n}`}>
                <SubTitle>{`${tr("Spouse", "Mwenza")} ${n}`}</SubTitle>
                <Row label={tr("Full Name", "Jina Kamili")} value={fullName(`sp${n}`)} />
                <Row label={tr("Date of Birth", "Tarehe ya Kuzaliwa")} value={val(`sp${n}Dob`)} />
                <Row label={tr("Gender", "Jinsia")} value={genderMap[s(`sp${n}Gender`)] ?? val(`sp${n}Gender`)} />
                <Row label={tr("Phone", "Simu")} value={val(`sp${n}Phone`)} />
                <Row label={tr("Nationality", "Utaifa")} value={val(`sp${n}NatCountry`)} />
                <Row label={tr("Occupation", "Kazi")} value={optionLabel(OCCUPATION_TYPE_OPTIONS, s(`sp${n}OccType`)) || "—"} />
                <Row label={tr("Document", "Hati")} value={
                  s(`sp${n}DocType`)
                    ? `${optionLabel(DOCUMENT_TYPE_OPTIONS, s(`sp${n}DocType`))}: ${val(`sp${n}DocNumber`)}`
                    : "—"
                } />
              </div>
            ))}

        <SubTitle>{tr("Relatives", "Ndugu")}</SubTitle>
        {Array.from({ length: relativeCount }, (_, i) => i + 1)
          .filter((n) => s(`rel${n}First`))
          .map((n) => (
            <div key={`rel${n}`}>
              <SubTitle>{`${tr("Relative", "Ndugu")} ${n}`}</SubTitle>
              <Row label={tr("Full Name", "Jina Kamili")} value={fullName(`rel${n}`)} />
              <Row label={tr("Relationship", "Uhusiano")} value={optionLabel(RELATIONSHIP_TYPE_OPTIONS, s(`rel${n}RelType`)) || "—"} />
              <Row label={tr("Date of Birth", "Tarehe ya Kuzaliwa")} value={val(`rel${n}Dob`)} />
              <Row label={tr("Gender", "Jinsia")} value={genderMap[s(`rel${n}Gender`)] ?? val(`rel${n}Gender`)} />
              <Row label={tr("Phone", "Simu")} value={val(`rel${n}Phone`)} />
              <Row label={tr("Nationality", "Utaifa")} value={val(`rel${n}NatCountry`)} />
              <Row label={tr("Occupation", "Kazi")} value={optionLabel(OCCUPATION_TYPE_OPTIONS, s(`rel${n}OccType`)) || "—"} />
              <Row label={tr("Document", "Hati")} value={
                s(`rel${n}DocType`)
                  ? `${optionLabel(DOCUMENT_TYPE_OPTIONS, s(`rel${n}DocType`))}: ${val(`rel${n}DocNumber`)}`
                  : "—"
              } />
            </div>
          ))}
      </Section>

      {/* ─── Section 7: Attachments ─── */}
      <Section title={tr("7. Attachments:", "7. Viambatisho:")}>
        <Row label={tr("Uploaded Documents", "Nyaraka Zilizopakiwa")} value={attachmentNames} />
      </Section>

      {/* ─── Section 8: Referees (print only, blank for manual completion) ─── */}
      <Section title={tr("8. Referees:", "8. Wadhamini wa Mwombaji:")}>
        <SuretyBlock index={1} tr={tr} />
        <SuretyBlock index={2} tr={tr} />
      </Section>

      {/* ─── Section 9: Witness to the Applicant (print only, blank) ─── */}
      <Section title={tr("9. Witness to the Applicant:", "9. Shuhuda kwa Mwombaji:")}>
        <Row label={tr("Full Name", "Jina Kamili")} value="" />
        <Row label={tr("Occupation / Title", "Kazi / Cheo")} value="" />
        <Row label={tr("Address", "Anwani")} value="" />
        <Row label={tr("Phone Number", "Simu")} value="" />
        <p className="declaration-note">
          {tr(
            "I witness that the information provided in this form is correct according to the applicant.",
            "Nashuhudia kwamba maelezo katika fomu hii ni sahihi kwa mujibu wa mwombaji.",
          )}
        </p>
        <div className="sig-row">
          <span className="sig-line">{tr("Signature & Seal", "Sahihi na Muhuri")}</span>
          <span className="sig-line">{tr("Date", "Tarehe")}</span>
        </div>
      </Section>

      {/* ─── Section 10: Applicant Declaration ─── */}
      <Section title={tr("10. Applicant Declaration:", "10. Tamko la Mwombaji:")}>
        <div className="declaration">
          <p>
            {locale === "sw" ? (
              <>
                Mimi, <strong>{applicantName}</strong>, ninathibitisha ya kwamba taarifa
                nilizozitoa katika fomu hii ni sahihi na kamili kadri ninavyojua na
                kuamini.
              </>
            ) : (
              <>
                I, <strong>{applicantName}</strong>, hereby solemnly declare that all the
                information I have provided in this registration form is true, accurate,
                and complete to the best of my knowledge and belief.
              </>
            )}
          </p>
          <p>
            {tr(
              "I understand that providing false, misleading, or fraudulent information is a criminal offence under the Laws of the United Republic of Tanzania.",
              "Ninaelewa kuwa kutoa taarifa za uongo, zenye kupotosha, au za udanganyifu ni kosa la jinai chini ya Sheria za Jamhuri ya Muungano wa Tanzania.",
            )}
          </p>
          <div className="sig-row">
            <span className="sig-line">{tr("Signature", "Sahihi")}</span>
            <span className="sig-line">
              {tr("Date", "Tarehe")}: {submittedDate}
            </span>
          </div>
        </div>
      </Section>

      <div className="official-box">
        <p>{tr("For Official Purposes Only", "Kwa Matumizi ya Ofisi Pekee")}</p>
        <div className="sig-row">
          <span className="sig-line">{tr("Signature", "Sahihi")}</span>
          <span className="sig-line">{tr("Official Stamp", "Muhuri Rasmi")}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper Components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="section-body">{children}</div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="subtitle">{children}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className="row-value">{value}</span>
    </div>
  );
}

/** Expanded parent block for the printable form. */
function ParentPrintBlock({
  prefix,
  label,
  tr,
  t,
  s,
  val,
}: {
  prefix: string;
  label: string;
  tr: Tr;
  t: (path: string) => string;
  s: (key: string) => string;
  val: (key: string) => string;
}) {
  const DOCUMENT_TYPE_OPTIONS = documentTypeOptions(t);
  const name = [s(`${prefix}First`), s(`${prefix}Middle`), s(`${prefix}Last`)]
    .filter(Boolean)
    .join(" ") || "—";
  const genderMap: Record<string, string> = {
    M: tr("Male", "Mwanaume"),
    F: tr("Female", "Mwanamke"),
  };
  const pobParts = [
    s(`${prefix}PobWard`),
    s(`${prefix}PobDistrict`),
    s(`${prefix}PobRegion`),
    s(`${prefix}PobCountry`),
  ].filter(Boolean).join(", ");
  const resParts = [
    s(`${prefix}ResStreet`),
    s(`${prefix}ResCity`),
    s(`${prefix}ResWard`),
    s(`${prefix}ResDistrict`),
    s(`${prefix}ResRegion`),
    s(`${prefix}ResCountry`),
  ].filter(Boolean).join(", ");

  return (
    <>
      <SubTitle>{label}</SubTitle>
      <Row label={tr("Full Name", "Jina Kamili")} value={name} />
      <Row label={tr("Date of Birth", "Tarehe ya Kuzaliwa")} value={val(`${prefix}Dob`)} />
      <Row label={tr("Gender", "Jinsia")} value={genderMap[s(`${prefix}Gender`)] ?? val(`${prefix}Gender`)} />
      <Row label={tr("Phone", "Simu")} value={val(`${prefix}Phone`)} />
      <Row label={tr("Nationality", "Utaifa")} value={val(`${prefix}NatCountry`)} />
      <Row label={tr("Place of Birth", "Mahali pa Kuzaliwa")} value={pobParts || "—"} />
      <Row label={tr("Village", "Kijiji")} value={val(`${prefix}Village`)} />
      <Row label={tr("Residence", "Makazi")} value={resParts || "—"} />
      {s(`${prefix}DocType`) && (
        <Row
          label={tr("Document", "Hati")}
          value={`${optionLabel(DOCUMENT_TYPE_OPTIONS, s(`${prefix}DocType`))}: ${val(`${prefix}DocNumber`)}`}
        />
      )}
    </>
  );
}

/** Emergency contact block for the printable form. */
function EmergencyPrintBlock({
  prefix,
  index,
  tr,
  t,
  s,
  val,
}: {
  prefix: string;
  index: number;
  tr: Tr;
  t: (path: string) => string;
  s: (key: string) => string;
  val: (key: string) => string;
}) {
  const RELATIONSHIP_TYPE_OPTIONS = relationshipTypeOptions(t);
  const OCCUPATION_TYPE_OPTIONS = occupationTypeOptions(t);
  const DOCUMENT_TYPE_OPTIONS = documentTypeOptions(t);
  const name = [s(`${prefix}First`), s(`${prefix}Middle`), s(`${prefix}Last`)]
    .filter(Boolean)
    .join(" ") || "—";
  const genderMap: Record<string, string> = {
    M: tr("Male", "Mwanaume"),
    F: tr("Female", "Mwanamke"),
  };
  const pobParts = [
    s(`${prefix}PobWard`),
    s(`${prefix}PobDistrict`),
    s(`${prefix}PobRegion`),
    s(`${prefix}PobCountry`),
  ].filter(Boolean).join(", ");
  const resParts = [
    s(`${prefix}ResStreet`),
    s(`${prefix}ResCity`),
    s(`${prefix}ResWard`),
    s(`${prefix}ResDistrict`),
    s(`${prefix}ResRegion`),
    s(`${prefix}ResCountry`),
  ].filter(Boolean).join(", ");

  return (
    <>
      <SubTitle>
        {tr(`Emergency Contact ${index}`, `Mtu wa Dharura wa ${index === 1 ? "Kwanza" : "Pili"}`)}
      </SubTitle>
      <Row label={tr("Full Name", "Jina Kamili")} value={name} />
      <Row label={tr("Relationship", "Uhusiano")} value={optionLabel(RELATIONSHIP_TYPE_OPTIONS, s(`${prefix}RelType`)) || "—"} />
      <Row label={tr("Occupation", "Kazi")} value={optionLabel(OCCUPATION_TYPE_OPTIONS, s(`${prefix}OccType`)) || "—"} />
      <Row label={tr("Date of Birth", "Tarehe ya Kuzaliwa")} value={val(`${prefix}Dob`)} />
      <Row label={tr("Gender", "Jinsia")} value={genderMap[s(`${prefix}Gender`)] ?? val(`${prefix}Gender`)} />
      <Row label={tr("Phone", "Simu")} value={val(`${prefix}Phone`)} />
      <Row label={tr("Nationality", "Utaifa")} value={val(`${prefix}NatCountry`)} />
      <Row label={tr("Place of Birth", "Mahali pa Kuzaliwa")} value={pobParts || "—"} />
      <Row label={tr("Village", "Kijiji")} value={val(`${prefix}Village`)} />
      <Row label={tr("Residence", "Makazi")} value={resParts || "—"} />
      {s(`${prefix}DocType`) && (
        <Row
          label={tr("Document", "Hati")}
          value={`${optionLabel(DOCUMENT_TYPE_OPTIONS, s(`${prefix}DocType`))}: ${val(`${prefix}DocNumber`)}`}
        />
      )}
    </>
  );
}

// Print-only referee (Mdhamini) block — all fields blank for manual completion.
function SuretyBlock({ index, tr }: { index: number; tr: Tr }) {
  const ordinal = tr(`Referee ${index}`, `Mdhamini wa ${index === 1 ? "Kwanza" : "Pili"}`);
  return (
    <>
      <SubTitle>{ordinal}</SubTitle>
      <Row label={tr("Full Name", "Jina Kamili")} value="" />
      <Row label={tr("Occupation / Title", "Kazi / Cheo")} value="" />
      <Row label={tr("Address", "Anuani")} value="" />
      <Row label={tr("Phone Number", "Namba ya Simu")} value="" />
      <Row label={tr("Residence", "Anapoishi")} value="" />
      <Row label={tr("Street", "Mtaa")} value="" />
      <Row label={tr("House No.", "Nyumba Na.")} value="" />
      <Row label={tr("Relationship", "Uhusiano")} value="" />
      <Row label={tr("Signature", "Sahihi")} value="" />
    </>
  );
}
