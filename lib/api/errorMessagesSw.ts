// Swahili translations for the backend's typed error catalogue (ErrorCode enum,
// tz.go.icrcs.common.constants.ErrorCode). The backend always replies in English;
// these let the UI show the same error in Swahili when the locale is "sw".
//
// Keyed by the EXACT English message the backend sends (ErrorCode.defaultMessage),
// because a single error arrives as { errorCode, message } and field-level
// validation arrives as { field: message } — both expose the message string, so
// matching on it covers every shape with one map. The messages are static (no
// interpolation), so exact matching is reliable. Keep this in sync with the
// backend enum when new codes are added.

export const ERROR_MESSAGES_SW: Record<string, string> = {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  "Phone number not found": "Namba ya simu haijapatikana",
  "Invalid OTP code": "Msimbo wa OTP si sahihi",
  "OTP has expired": "Muda wa OTP umeisha",
  "Too many OTP attempts. Try again later.":
    "Umejaribu OTP mara nyingi mno. Tafadhali jaribu tena baadaye.",
  "Invalid credentials": "Taarifa za kuingia si sahihi",
  "New password must not match any of your last 5 passwords":
    "Nenosiri jipya lisifanane na mojawapo ya manenosiri yako 5 ya mwisho",
  "Account temporarily locked due to too many failed attempts. Try again later.":
    "Akaunti imefungwa kwa muda kutokana na majaribio mengi yaliyoshindikana. Tafadhali jaribu tena baadaye.",
  "Refresh token is invalid or expired":
    "Tokeni ya kuhuisha si sahihi au muda wake umeisha",
  "Maximum OTP attempts exceeded": "Umevuka kiwango cha juu cha majaribio ya OTP",
  "OTP resend limit reached": "Umefikia kikomo cha kutuma OTP upya",
  "Please wait before requesting another OTP":
    "Tafadhali subiri kabla ya kuomba OTP nyingine",
  "Account is not active": "Akaunti haijawashwa",
  "Account is already active. Please login instead.":
    "Akaunti tayari imewashwa. Tafadhali ingia badala yake.",
  "Invalid or malformed token": "Tokeni si sahihi au imeharibika",
  "Token has expired": "Muda wa tokeni umeisha",
  "Account is temporarily locked": "Akaunti imefungwa kwa muda",

  // ── PROFILE ───────────────────────────────────────────────────────────────
  "Phone number already registered": "Namba ya simu tayari imesajiliwa",
  "Email address already registered": "Anwani ya barua pepe tayari imesajiliwa",
  "Profile not found": "Wasifu haujapatikana",
  "Phone number must be a valid Tanzania mobile number":
    "Namba ya simu lazima iwe namba halali ya simu ya Tanzania",
  "Phone number is too short. Please include a valid mobile number (e.g. 0712345678 or +255712345678)":
    "Namba ya simu ni fupi mno. Tafadhali weka namba halali ya simu (mfano 0712345678 au +255712345678)",
  "Profile is already active": "Wasifu tayari umewashwa",

  // ── RATE LIMITING ─────────────────────────────────────────────────────────
  "Too many requests. Please slow down and try again later.":
    "Maombi mengi mno. Tafadhali punguza kasi na ujaribu tena baadaye.",

  // ── FILE UPLOAD ───────────────────────────────────────────────────────────
  "File is empty or missing": "Faili ni tupu au halipo",
  "File exceeds maximum size of 500KB": "Faili limezidi ukubwa wa juu wa 500KB",
  "File type not allowed. Use jpg, png or pdf":
    "Aina ya faili hairuhusiwi. Tumia jpg, png au pdf",
  "File could not be saved. Please try again":
    "Faili halikuweza kuhifadhiwa. Tafadhali jaribu tena",

  // ── LOOKUP ────────────────────────────────────────────────────────────────
  "Lookup record not found": "Kumbukumbu ya rejea haijapatikana",
  "Ward not found": "Kata haijapatikana",
  "District not found": "Wilaya haijapatikana",
  "Region not found": "Mkoa haujapatikana",
  "Document type not found": "Aina ya hati haijapatikana",
  "Education level not found": "Kiwango cha elimu hakijapatikana",
  "Street ID not found in the geographic lookup":
    "Kitambulisho cha mtaa hakijapatikana katika rejea ya kijiografia",
  "Lookup service is temporarily unavailable. Please try again later.":
    "Huduma ya rejea haipatikani kwa muda. Tafadhali jaribu tena baadaye.",

  // ── REGISTRATION — Business Rules ─────────────────────────────────────────
  "Maximum of 10 registrations per profile has been reached":
    "Umefikia kikomo cha usajili 10 kwa kila wasifu",
  "This registration does not belong to your profile":
    "Usajili huu si wa wasifu wako",
  "Registration email must be verified before proceeding to the next stage":
    "Barua pepe ya usajili lazima ithibitishwe kabla ya kuendelea na hatua inayofuata",
  "Registration OTP has expired. Please request a new one":
    "Muda wa OTP ya usajili umeisha. Tafadhali omba mpya",
  "Invalid registration OTP code": "Msimbo wa OTP ya usajili si sahihi",
  "Please wait 10 minutes before requesting a new OTP":
    "Tafadhali subiri dakika 10 kabla ya kuomba OTP mpya",
  "Passport size photo is mandatory. Please upload it before completing Stage 5.":
    "Picha ya pasipoti ni lazima. Tafadhali ipakie kabla ya kukamilisha Hatua ya 5.",
  "At least one of Birth Certificate or Affidavit Birth Certificate is required.":
    "Angalau mojawapo ya Cheti cha Kuzaliwa au Cheti cha Kiapo cha Kuzaliwa kinahitajika.",
  "Birth Certificate attachment is mandatory. Please upload it before completing Stage 5.":
    "Kiambatisho cha Cheti cha Kuzaliwa ni lazima. Tafadhali kipakie kabla ya kukamilisha Hatua ya 5.",
  "A claim request is already pending for this registration.":
    "Tayari kuna ombi la madai linalosubiri kwa usajili huu.",
  "Claim not found or you do not have permission to respond to it.":
    "Madai hayajapatikana au huna ruhusa ya kuyajibu.",
  "This claim is no longer pending and cannot be modified.":
    "Madai haya hayasubiri tena na hayawezi kubadilishwa.",
  "This claim has expired. Please submit a new claim request.":
    "Muda wa madai haya umeisha. Tafadhali wasilisha ombi jipya la madai.",
  "This registration is not a child registration and cannot be claimed.":
    "Usajili huu si wa mtoto na hauwezi kudaiwa.",
  "You must be 18 or older to claim a registration as your own.":
    "Lazima uwe na umri wa miaka 18 au zaidi ili kudai usajili kuwa wako.",
  "At least one identification document is required for adults.":
    "Angalau hati moja ya utambulisho inahitajika kwa watu wazima.",
  "Your own registration must be approved before you can register a child. Please visit an Immigration Office first.":
    "Usajili wako lazima uidhinishwe kabla ya kumsajili mtoto. Tafadhali tembelea Ofisi ya Uhamiaji kwanza.",
  "Applicants under 18 must be registered by a parent or guardian with an approved registration.":
    "Waombaji walio chini ya miaka 18 lazima wasajiliwe na mzazi au mlezi mwenye usajili ulioidhinishwa.",
  "Applicants aged 18 or over must register themselves using their own profile.":
    "Waombaji wenye umri wa miaka 18 au zaidi lazima wajisajili wenyewe kwa kutumia wasifu wao.",
  "You already have a self-registration. An adult can only register themselves once.":
    "Tayari una usajili wako binafsi. Mtu mzima anaweza kujisajili mara moja tu.",
  "You can only register your own children.":
    "Unaweza kuwasajili watoto wako mwenyewe pekee.",
  "No registration found for this profile":
    "Hakuna usajili uliopatikana kwa wasifu huu",
  "Email already registered": "Barua pepe tayari imesajiliwa",
  "This stage has already been submitted": "Hatua hii tayari imewasilishwa",
  "Previous stage must be completed first":
    "Hatua iliyotangulia lazima ikamilishwe kwanza",
  "Naturalization certificate details are required for NATURALIZATION citizenship":
    "Taarifa za cheti cha uraia wa kuandikishwa zinahitajika kwa uraia wa NATURALIZATION",
  "Permanent address details are required when not same as current":
    "Taarifa za anuani ya kudumu zinahitajika pale isipofanana na ya sasa",
  "Declaration must be confirmed to complete registration":
    "Tamko lazima lithibitishwe ili kukamilisha usajili",
  "Organization name is required for employed applicants":
    "Jina la taasisi linahitajika kwa waombaji walioajiriwa",
  "A document of this type has already been submitted":
    "Hati ya aina hii tayari imewasilishwa",
  "This document number is already registered":
    "Namba hii ya hati tayari imesajiliwa",
  "Document number format is invalid for the specified document type":
    "Muundo wa namba ya hati si sahihi kwa aina ya hati iliyochaguliwa",
  "Document type not allowed. Accepted: NIDA, Birth Certificate, Driving Licence, TIN, Voters ID":
    "Aina ya hati hairuhusiwi. Zinazokubalika: NIDA, Cheti cha Kuzaliwa, Leseni ya Udereva, TIN, Kitambulisho cha Mpiga Kura",
  "Child information is required when hasChildren is true":
    "Taarifa za mtoto zinahitajika pale unapokuwa na watoto",
  "A minor applicant cannot declare children — applicant must be at least 16 years old":
    "Mwombaji mdogo wa umri hawezi kutangaza watoto — mwombaji lazima awe na umri wa angalau miaka 16",
  "Declared child must have been born after the applicant turned 16":
    "Mtoto aliyetangazwa lazima awe alizaliwa baada ya mwombaji kutimiza miaka 16",
  "Invalid date format. Use YYYY-MM-DD": "Muundo wa tarehe si sahihi. Tumia YYYY-MM-DD",
  "Declaration not found. Review is only available after declaration is submitted.":
    "Tamko halijapatikana. Mapitio yanapatikana tu baada ya tamko kuwasilishwa.",

  // ── REGISTRATION — REG_* aliases ──────────────────────────────────────────
  "Registration record not found": "Kumbukumbu ya usajili haijapatikana",
  "Registration has been deleted": "Usajili umefutwa",
  "Invalid registration status transition":
    "Mabadiliko ya hali ya usajili si halali",
  "Registration is already approved": "Usajili tayari umeidhinishwa",
  "Citizenship already recorded": "Uraia tayari umeandikishwa",
  "Document of this type already recorded":
    "Hati ya aina hii tayari imeandikishwa",
  "Document number already registered": "Namba ya hati tayari imesajiliwa",
  "Address of this type already recorded":
    "Anuani ya aina hii tayari imeandikishwa",
  "Parent of this type already recorded":
    "Mzazi wa aina hii tayari ameandikishwa",
  "Emergency contact order already used":
    "Mpangilio wa mawasiliano ya dharura tayari umetumika",
  "Naturalization details required": "Taarifa za uraia wa kuandikishwa zinahitajika",
  "Declaration already submitted": "Tamko tayari limewasilishwa",

  // ── VALIDATION ────────────────────────────────────────────────────────────
  "Validation failed": "Uhakiki umeshindikana",
  "Date of birth cannot be in the future":
    "Tarehe ya kuzaliwa haiwezi kuwa ya baadaye",
  "Required field is blank": "Sehemu inayohitajika ni tupu",

  // ── REGISTRATION — Stage 1: Applicant Personal Information ─────────────────
  "First name is required": "Jina la kwanza linahitajika",
  "First name cannot exceed 100 characters":
    "Jina la kwanza haliwezi kuzidi herufi 100",
  "Middle name cannot exceed 100 characters":
    "Jina la kati haliwezi kuzidi herufi 100",
  "Last name is required": "Jina la mwisho linahitajika",
  "Last name cannot exceed 100 characters":
    "Jina la mwisho haliwezi kuzidi herufi 100",
  "Sex is required": "Jinsia inahitajika",
  "Date of birth is required": "Tarehe ya kuzaliwa inahitajika",
  "Nationality code is required": "Msimbo wa uraia unahitajika",
  "Nationality code must be a valid 3-letter ISO-3166-1 alpha-3 code":
    "Msimbo wa uraia lazima uwe msimbo halali wa herufi 3 wa ISO-3166-1 alpha-3",
  "Citizenship type is required": "Aina ya uraia inahitajika",
  "Place of birth street is required for Tanzanian births":
    "Mtaa wa mahali pa kuzaliwa unahitajika kwa waliozaliwa Tanzania",
  "Country of birth code is required for foreign-born citizens":
    "Msimbo wa nchi ya kuzaliwa unahitajika kwa raia waliozaliwa nje",
  "Country of birth must be a valid 3-letter ISO-3166-1 alpha-3 code":
    "Nchi ya kuzaliwa lazima iwe msimbo halali wa herufi 3 wa ISO-3166-1 alpha-3",
  "City of birth is required for foreign-born citizens":
    "Jiji la kuzaliwa linahitajika kwa raia waliozaliwa nje",
  "City of birth cannot exceed 100 characters":
    "Jiji la kuzaliwa haliwezi kuzidi herufi 100",
  "Phone number is required": "Namba ya simu inahitajika",
  "Invalid phone number format": "Muundo wa namba ya simu si sahihi",
  "Email address is required": "Anwani ya barua pepe inahitajika",
  "Invalid email format": "Muundo wa barua pepe si sahihi",
  "Email cannot exceed 255 characters": "Barua pepe haiwezi kuzidi herufi 255",
  "Name contains invalid characters — only letters, spaces, hyphens and apostrophes are allowed":
    "Jina lina herufi zisizoruhusiwa — herufi, nafasi, vistari na alama za mkato pekee zinaruhusiwa",
  "Date of birth exceeds maximum allowed age of 130 years":
    "Tarehe ya kuzaliwa inazidi umri wa juu unaoruhusiwa wa miaka 130",
  "Unknown ISO-3166-1 alpha-3 country code":
    "Msimbo wa nchi wa ISO-3166-1 alpha-3 haujulikani",

  // ── REGISTRATION — Stage 2: Address ───────────────────────────────────────
  "Current street is required": "Mtaa wa sasa unahitajika",
  "Permanent street is required": "Mtaa wa kudumu unahitajika",
  "Current residence country is required": "Nchi ya makazi ya sasa inahitajika",
  "Current residence country is not a valid ISO-3166-1 alpha-3 code":
    "Nchi ya makazi ya sasa si msimbo halali wa ISO-3166-1 alpha-3",
  "Current residence city is required for foreign residence":
    "Jiji la makazi ya sasa linahitajika kwa makazi ya nje",
  "Permanent residence country is required": "Nchi ya makazi ya kudumu inahitajika",
  "Permanent residence country is not a valid ISO-3166-1 alpha-3 code":
    "Nchi ya makazi ya kudumu si msimbo halali wa ISO-3166-1 alpha-3",
  "Permanent residence city is required for foreign residence":
    "Jiji la makazi ya kudumu linahitajika kwa makazi ya nje",
  "Provide a Tanzania street ID or a country code + city for current address":
    "Toa kitambulisho cha mtaa wa Tanzania au msimbo wa nchi + jiji kwa anuani ya sasa",

  // ── REGISTRATION — Stage 3: Parents ───────────────────────────────────────
  "Father information is required": "Taarifa za baba zinahitajika",
  "Mother information is required": "Taarifa za mama zinahitajika",
  "Parent first name is required": "Jina la kwanza la mzazi linahitajika",
  "Parent first name cannot exceed 100 characters":
    "Jina la kwanza la mzazi haliwezi kuzidi herufi 100",
  "Parent middle name is required": "Jina la kati la mzazi linahitajika",
  "Parent middle name cannot exceed 100 characters":
    "Jina la kati la mzazi haliwezi kuzidi herufi 100",
  "Parent last name is required": "Jina la mwisho la mzazi linahitajika",
  "Parent last name cannot exceed 100 characters":
    "Jina la mwisho la mzazi haliwezi kuzidi herufi 100",
  "Parent nationality code is required": "Msimbo wa uraia wa mzazi unahitajika",
  "Parent nationality must be a valid 3-letter ISO-3166-1 alpha-3 code":
    "Uraia wa mzazi lazima uwe msimbo halali wa herufi 3 wa ISO-3166-1 alpha-3",
  "Parent residence country is required": "Nchi ya makazi ya mzazi inahitajika",
  "Parent residence country cannot be TZA for a foreign-resident parent":
    "Nchi ya makazi ya mzazi haiwezi kuwa TZA kwa mzazi anayeishi nje",
  "Parent residence street is required for Tanzania residence":
    "Mtaa wa makazi ya mzazi unahitajika kwa makazi ya Tanzania",
  "Parent residence city is required for foreign residence":
    "Jiji la makazi ya mzazi linahitajika kwa makazi ya nje",
  "Invalid parent phone number format":
    "Muundo wa namba ya simu ya mzazi si sahihi",
  "Parent must be at least 16 years older than the applicant":
    "Mzazi lazima awe mkubwa kwa angalau miaka 16 kuliko mwombaji",

  // ── REGISTRATION — Stage 4: Education & Employment ─────────────────────────
  "Education level is required": "Kiwango cha elimu kinahitajika",
  "Education country code is required": "Msimbo wa nchi ya elimu unahitajika",
  "Education country must be a valid 3-letter ISO-3166-1 alpha-3 code":
    "Nchi ya elimu lazima iwe msimbo halali wa herufi 3 wa ISO-3166-1 alpha-3",
  "Education city is required": "Jiji la elimu linahitajika",
  "Education school name is required": "Jina la shule linahitajika",
  "Education registration number is required":
    "Namba ya usajili ya elimu inahitajika",
  "Education completion year is required": "Mwaka wa kumaliza elimu unahitajika",
  "Completion year must be between 1900 and current year":
    "Mwaka wa kumaliza lazima uwe kati ya 1900 na mwaka huu",
  "Employment status is required": "Hali ya ajira inahitajika",
  "Occupation type is required": "Aina ya kazi inahitajika",
  "Invalid education level": "Kiwango cha elimu si sahihi",
  "Invalid employment status": "Hali ya ajira si sahihi",
  "Invalid occupation type": "Aina ya kazi si sahihi",
  "Primary education is required": "Elimu ya msingi inahitajika",
  "Duplicate education level — each level can only appear once":
    "Kiwango cha elimu kimerudiwa — kila kiwango kinaweza kuonekana mara moja tu",
  "Completion year cannot be earlier than applicant's year of birth":
    "Mwaka wa kumaliza hauwezi kuwa kabla ya mwaka wa kuzaliwa wa mwombaji",

  // ── REGISTRATION — Stage 5: Documents & Attachments ───────────────────────
  "Attachments list is required": "Orodha ya viambatisho inahitajika",
  "Attachment type ID is required": "Kitambulisho cha aina ya kiambatisho kinahitajika",
  "Attachment file URL is required": "Anwani ya faili la kiambatisho inahitajika",
  "Invalid attachment type": "Aina ya kiambatisho si sahihi",
  "A mandatory attachment is missing": "Kiambatisho cha lazima hakipo",
  "Too many attachments — maximum 20 allowed":
    "Viambatisho vingi mno — vinavyoruhusiwa ni 20 kwa juu",
  "Attachment URL must be from the ICRCS file server":
    "Anwani ya kiambatisho lazima itoke kwenye seva ya faili ya ICRCS",
  "Duplicate attachment type — each type can only appear once":
    "Aina ya kiambatisho imerudiwa — kila aina inaweza kuonekana mara moja tu",

  // ── REGISTRATION — Stage 6: Family ────────────────────────────────────────
  "Marital status is required": "Hali ya ndoa inahitajika",
  "Invalid marital status": "Hali ya ndoa si sahihi",
  "Sex must be 1 (Female) or 2 (Male)": "Jinsia lazima iwe 1 (Mke) au 2 (Mume)",
  "Citizenship type must be 1 (Birth), 2 (Descent) or 3 (Naturalization)":
    "Aina ya uraia lazima iwe 1 (Kuzaliwa), 2 (Asili) au 3 (Kuandikishwa)",
  "Gender must be 1 (Female) or 2 (Male)": "Jinsia lazima iwe 1 (Mke) au 2 (Mume)",
  "Invalid relationship type": "Aina ya uhusiano si sahihi",
  "Spouse gender is required": "Jinsia ya mwenzi wa ndoa inahitajika",
  "Spouse must be of the opposite gender to the account owner":
    "Mwenzi wa ndoa lazima awe wa jinsia tofauti na mmiliki wa akaunti",
  "At least 1 emergency contact is required":
    "Angalau mawasiliano 1 ya dharura yanahitajika",
  "Too many emergency contacts — maximum 10 allowed":
    "Mawasiliano mengi mno ya dharura — yanayoruhusiwa ni 10 kwa juu",
  "Emergency contact must be at least 18 years old":
    "Mawasiliano ya dharura lazima yawe na umri wa angalau miaka 18",
  "Emergency contact person details are required":
    "Taarifa za mtu wa mawasiliano ya dharura zinahitajika",
  "Relative person details are required": "Taarifa za ndugu zinahitajika",
  "Spouse person details are required":
    "Taarifa za mwenzi wa ndoa zinahitajika",
  "Emergency contact relationship is required":
    "Uhusiano wa mawasiliano ya dharura unahitajika",
  "Emergency contact first name is required":
    "Jina la kwanza la mawasiliano ya dharura linahitajika",
  "Emergency contact last name is required":
    "Jina la mwisho la mawasiliano ya dharura linahitajika",
  "Emergency contact phone number is required":
    "Namba ya simu ya mawasiliano ya dharura inahitajika",
  "Invalid emergency contact phone number format":
    "Muundo wa namba ya simu ya mawasiliano ya dharura si sahihi",
  "Emergency contact residence street is required":
    "Mtaa wa makazi ya mawasiliano ya dharura unahitajika",
  "Emergency contact residence country is required":
    "Nchi ya makazi ya mawasiliano ya dharura inahitajika",
  "Emergency contact residence country is not a valid ISO-3166-1 alpha-3 code":
    "Nchi ya makazi ya mawasiliano ya dharura si msimbo halali wa ISO-3166-1 alpha-3",
  "Emergency contact residence city is required for foreign residence":
    "Jiji la makazi ya mawasiliano ya dharura linahitajika kwa makazi ya nje",
  "At least 2 relatives are required": "Angalau ndugu 2 wanahitajika",
  "Too many relatives — maximum 20 allowed":
    "Ndugu wengi mno — wanaoruhusiwa ni 20 kwa juu",
  "Relative relationship type is required": "Aina ya uhusiano wa ndugu inahitajika",
  "Relative first name is required": "Jina la kwanza la ndugu linahitajika",
  "Relative last name is required": "Jina la mwisho la ndugu linahitajika",
  "Relative nationality code is required": "Msimbo wa uraia wa ndugu unahitajika",
  "Relative nationality must be a valid 3-letter ISO-3166-1 alpha-3 code":
    "Uraia wa ndugu lazima uwe msimbo halali wa herufi 3 wa ISO-3166-1 alpha-3",
  "Invalid relative phone number format":
    "Muundo wa namba ya simu ya ndugu si sahihi",
  "Relative residence country is required": "Nchi ya makazi ya ndugu inahitajika",
  "Relative residence country is not a valid ISO-3166-1 alpha-3 code":
    "Nchi ya makazi ya ndugu si msimbo halali wa ISO-3166-1 alpha-3",
  "Relative residence street is required for Tanzania residence":
    "Mtaa wa makazi ya ndugu unahitajika kwa makazi ya Tanzania",
  "Relative residence city is required for foreign residence":
    "Jiji la makazi ya ndugu linahitajika kwa makazi ya nje",
  "Relative date of birth is out of valid range":
    "Tarehe ya kuzaliwa ya ndugu iko nje ya kipindi halali",
  "Spouse information is required for married status":
    "Taarifa za mwenzi wa ndoa zinahitajika kwa hali ya ndoa",
  "Too many spouses — maximum 4 allowed":
    "Wenzi wa ndoa wengi mno — wanaoruhusiwa ni 4 kwa juu",
  "Spouse date of birth is required": "Tarehe ya kuzaliwa ya mwenzi wa ndoa inahitajika",
  "Spouse first name is required": "Jina la kwanza la mwenzi wa ndoa linahitajika",
  "Spouse last name is required": "Jina la mwisho la mwenzi wa ndoa linahitajika",
  "Spouse nationality code is required": "Msimbo wa uraia wa mwenzi wa ndoa unahitajika",
  "Spouse nationality must be a valid 3-letter ISO-3166-1 alpha-3 code":
    "Uraia wa mwenzi wa ndoa lazima uwe msimbo halali wa herufi 3 wa ISO-3166-1 alpha-3",
  "Invalid spouse phone number format":
    "Muundo wa namba ya simu ya mwenzi wa ndoa si sahihi",
  "Spouse residence country is required": "Nchi ya makazi ya mwenzi wa ndoa inahitajika",
  "Spouse residence country is not a valid ISO-3166-1 alpha-3 code":
    "Nchi ya makazi ya mwenzi wa ndoa si msimbo halali wa ISO-3166-1 alpha-3",
  "Spouse residence street is required for Tanzania residence":
    "Mtaa wa makazi ya mwenzi wa ndoa unahitajika kwa makazi ya Tanzania",
  "Spouse residence city is required for foreign residence":
    "Jiji la makazi ya mwenzi wa ndoa linahitajika kwa makazi ya nje",
  "Spouse must be at least 16 years old":
    "Mwenzi wa ndoa lazima awe na umri wa angalau miaka 16",
  "Relative date of birth is required": "Tarehe ya kuzaliwa ya ndugu inahitajika",
  "Child first name is required": "Jina la kwanza la mtoto linahitajika",
  "Child last name is required": "Jina la mwisho la mtoto linahitajika",
  "Child sex is required": "Jinsia ya mtoto inahitajika",
  "Child date of birth is required": "Tarehe ya kuzaliwa ya mtoto inahitajika",
  "Child nationality code is required": "Msimbo wa uraia wa mtoto unahitajika",
  "Child nationality must be a valid 3-letter ISO-3166-1 alpha-3 code":
    "Uraia wa mtoto lazima uwe msimbo halali wa herufi 3 wa ISO-3166-1 alpha-3",
  "Child residence address is required": "Anuani ya makazi ya mtoto inahitajika",
  "Too many children — maximum 30 allowed":
    "Watoto wengi mno — wanaoruhusiwa ni 30 kwa juu",

  // ── REGISTRATION — Naturalization ─────────────────────────────────────────
  "Naturalization certificate number is required":
    "Namba ya cheti cha uraia wa kuandikishwa inahitajika",
  "Naturalization issue place is required":
    "Mahali pa kutolewa cheti cha uraia wa kuandikishwa panahitajika",
  "Naturalization issue date is required":
    "Tarehe ya kutolewa cheti cha uraia wa kuandikishwa inahitajika",
  "Naturalization issue date cannot be in the future":
    "Tarehe ya kutolewa cheti cha uraia wa kuandikishwa haiwezi kuwa ya baadaye",

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  "Registration not found": "Usajili haujapatikana",
  "Invalid status transition for this registration":
    "Mabadiliko ya hali si halali kwa usajili huu",
  "Officer is not authorized for this action":
    "Afisa haruhusiwi kufanya kitendo hiki",

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  "An unexpected error occurred": "Hitilafu isiyotarajiwa imetokea",
  "Authentication required": "Uthibitishaji unahitajika",
  "Access denied": "Ufikiaji umekataliwa",
  "Resource not found": "Rasilimali haijapatikana",
  "HTTP method not allowed": "Njia ya HTTP hairuhusiwi",
};

/**
 * Translate a backend (English) error message to Swahili when the locale is
 * "sw". Returns the original message unchanged for any other locale, or when the
 * message isn't in the catalogue (so unknown/dynamic messages still show).
 */
export function localizeBackendMessage(message: string, locale: string): string {
  if (locale !== "sw" || !message) return message;
  return ERROR_MESSAGES_SW[message.trim()] ?? message;
}
