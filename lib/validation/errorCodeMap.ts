/**
 * lib/validation/errorCodeMap.ts
 *
 * Maps every backend ErrorCode (from ErrorCode.java) to:
 *   - the form field it should attach to, if any
 *   - an i18n key
 *   - a display action: 'field' (inline), 'toast' (transient), 'banner' (persistent), 'redirect-login'
 *
 * Codes with no `field` are server-only rules that can't be pre-validated
 * (uniqueness, sequencing, rate limits, lookups, account state).
 *
 * NOTE: this app already localizes backend messages by message text
 * (lib/api/errorMessagesSw.ts) and maps field paths (lib/registry/errorFields.ts).
 * This map is the code -> action/field reference; wire resolveApiError() into
 * the fetch layer when you want code-driven routing (toast/banner/redirect).
 */

export type ErrorAction = 'field' | 'toast' | 'banner' | 'redirect-login';

export interface ErrorMapping {
  field?: string;
  i18nKey: string;
  action: ErrorAction;
}

export const ERROR_CODE_MAP: Record<string, ErrorMapping> = {
  // AUTH
  AUTH_PHONE_NOT_FOUND: { i18nKey: 'errors.auth.phoneNotFound', action: 'banner' },
  AUTH_OTP_INVALID: { field: 'otpCode', i18nKey: 'errors.otp.invalid', action: 'field' },
  AUTH_OTP_EXPIRED: { field: 'otpCode', i18nKey: 'errors.otp.expired', action: 'field' },
  AUTH_OTP_BLOCKED: { i18nKey: 'errors.otp.blocked', action: 'banner' },
  AUTH_INVALID_CREDENTIALS: { i18nKey: 'errors.auth.invalidCredentials', action: 'banner' },
  AUTH_PASSWORD_REUSE: { field: 'newPassword', i18nKey: 'errors.password.reuse', action: 'field' },
  AUTH_ACCOUNT_LOCKED: { i18nKey: 'errors.auth.locked', action: 'banner' },
  AUTH_REFRESH_TOKEN_INVALID: { i18nKey: 'errors.auth.refreshInvalid', action: 'redirect-login' },
  AUTH_OTP_MAX_ATTEMPTS: { field: 'otpCode', i18nKey: 'errors.otp.maxAttempts', action: 'field' },
  AUTH_OTP_RESEND_LIMIT: { i18nKey: 'errors.otp.resendLimit', action: 'toast' },
  AUTH_OTP_RESEND_COOLDOWN: { i18nKey: 'errors.otp.resendCooldown', action: 'toast' },
  AUTH_ACCOUNT_INACTIVE: { i18nKey: 'errors.auth.inactive', action: 'banner' },
  AUTH_ACCOUNT_ALREADY_ACTIVE: { i18nKey: 'errors.auth.alreadyActive', action: 'banner' },
  AUTH_TOKEN_INVALID: { i18nKey: 'errors.auth.tokenInvalid', action: 'redirect-login' },
  AUTH_TOKEN_EXPIRED: { i18nKey: 'errors.auth.tokenExpired', action: 'redirect-login' },
  AUTH_LOCKED: { i18nKey: 'errors.auth.locked', action: 'banner' }, // deprecated alias

  // PROFILE
  PROFILE_PHONE_EXISTS: { field: 'phoneNumber', i18nKey: 'errors.profile.phoneExists', action: 'field' },
  PROFILE_EMAIL_EXISTS: { field: 'email', i18nKey: 'errors.profile.emailExists', action: 'field' },
  PROFILE_NOT_FOUND: { i18nKey: 'errors.profile.notFound', action: 'banner' },
  PROFILE_PHONE_FORMAT_INVALID: { field: 'phoneNumber', i18nKey: 'errors.profile.phoneFormat', action: 'field' },
  PROFILE_PHONE_TOO_SHORT: { field: 'phoneNumber', i18nKey: 'errors.profile.phoneTooShort', action: 'field' },
  PROFILE_ALREADY_ACTIVE: { i18nKey: 'errors.profile.alreadyActive', action: 'banner' },

  // RATE LIMITING / FILE UPLOAD
  RATE_LIMIT_EXCEEDED: { i18nKey: 'errors.system.rateLimit', action: 'toast' },
  FILE_EMPTY: { i18nKey: 'errors.file.empty', action: 'toast' },
  FILE_TOO_LARGE: { i18nKey: 'errors.file.tooLarge', action: 'toast' },
  FILE_TYPE_NOT_ALLOWED: { i18nKey: 'errors.file.typeNotAllowed', action: 'toast' },
  FILE_STORAGE_FAILED: { i18nKey: 'errors.file.storageFailed', action: 'toast' },

  // LOOKUP
  LOOKUP_NOT_FOUND: { i18nKey: 'errors.lookup.notFound', action: 'toast' },
  LOOKUP_WARD_NOT_FOUND: { field: 'wardId', i18nKey: 'errors.lookup.ward', action: 'field' },
  LOOKUP_DISTRICT_NOT_FOUND: { field: 'districtId', i18nKey: 'errors.lookup.district', action: 'field' },
  LOOKUP_REGION_NOT_FOUND: { field: 'regionId', i18nKey: 'errors.lookup.region', action: 'field' },
  LOOKUP_DOC_TYPE_NOT_FOUND: { field: 'attachmentTypeId', i18nKey: 'errors.lookup.docType', action: 'field' },
  LOOKUP_EDU_LEVEL_NOT_FOUND: { field: 'educationLevelId', i18nKey: 'errors.lookup.eduLevel', action: 'field' },
  LOOKUP_STREET_NOT_FOUND: { field: 'streetId', i18nKey: 'errors.lookup.street', action: 'field' },
  LOOKUP_SERVICE_UNAVAILABLE: { i18nKey: 'errors.lookup.unavailable', action: 'banner' },

  // REGISTRATION - business rules / sequencing
  REGISTRATION_LIMIT_REACHED: { i18nKey: 'errors.reg.limitReached', action: 'banner' },
  REGISTRATION_NOT_OWNED: { i18nKey: 'errors.reg.notOwned', action: 'banner' },
  REGISTRATION_EMAIL_NOT_VERIFIED: { i18nKey: 'errors.reg.emailNotVerified', action: 'banner' },
  REGISTRATION_OTP_EXPIRED: { field: 'otpCode', i18nKey: 'errors.reg.otpExpired', action: 'field' },
  REGISTRATION_OTP_INVALID: { field: 'otpCode', i18nKey: 'errors.reg.otpInvalid', action: 'field' },
  REGISTRATION_OTP_RESEND_TOO_SOON: { i18nKey: 'errors.reg.otpResendTooSoon', action: 'toast' },
  REGISTRATION_PASSPORT_PHOTO_REQUIRED: { field: 'attachments', i18nKey: 'errors.reg.passportPhotoRequired', action: 'field' },
  REGISTRATION_BIRTH_OR_AFFIDAVIT_REQUIRED: { field: 'attachments', i18nKey: 'errors.reg.birthOrAffidavitRequired', action: 'field' },
  REGISTRATION_BIRTH_CERT_REQUIRED: { field: 'attachments', i18nKey: 'errors.reg.birthCertRequired', action: 'field' },
  REGISTRATION_CLAIM_ALREADY_PENDING: { i18nKey: 'errors.claim.alreadyPending', action: 'banner' },
  REGISTRATION_CLAIM_NOT_FOUND: { i18nKey: 'errors.claim.notFound', action: 'banner' },
  REGISTRATION_CLAIM_NOT_PENDING: { i18nKey: 'errors.claim.notPending', action: 'banner' },
  REGISTRATION_CLAIM_EXPIRED: { i18nKey: 'errors.claim.expired', action: 'banner' },
  REGISTRATION_NOT_A_CHILD_REGISTRATION: { i18nKey: 'errors.claim.notChildReg', action: 'banner' },
  REGISTRATION_CLAIM_AGE_REQUIRED: { i18nKey: 'errors.claim.ageRequired', action: 'banner' },
  REGISTRATION_DOCUMENTS_REQUIRED: { field: 'attachments', i18nKey: 'errors.reg.documentsRequired', action: 'field' },
  REGISTRATION_PARENT_NOT_APPROVED: { i18nKey: 'errors.reg.parentNotApproved', action: 'banner' },
  REGISTRATION_CHILD_REQUIRES_PARENT: { i18nKey: 'errors.reg.childRequiresParent', action: 'banner' },
  REGISTRATION_ADULT_CANNOT_HAVE_PARENT: { i18nKey: 'errors.reg.adultCannotHaveParent', action: 'banner' },
  REGISTRATION_SELF_ALREADY_EXISTS: { i18nKey: 'errors.reg.selfAlreadyExists', action: 'banner' },
  REGISTRATION_NOT_YOUR_CHILD: { i18nKey: 'errors.reg.notYourChild', action: 'banner' },
  REGISTRATION_NOT_FOUND: { i18nKey: 'errors.reg.notFound', action: 'banner' },
  REGISTRATION_PHONE_EXISTS: { field: 'phoneNumber', i18nKey: 'errors.reg.phoneExists', action: 'field' },
  REGISTRATION_EMAIL_EXISTS: { field: 'email', i18nKey: 'errors.reg.emailExists', action: 'field' },
  REGISTRATION_STAGE_ALREADY_SUBMITTED: { i18nKey: 'errors.reg.stageAlreadySubmitted', action: 'banner' },
  REGISTRATION_PREVIOUS_STAGE_REQUIRED: { i18nKey: 'errors.reg.previousStageRequired', action: 'redirect-login' },
  REGISTRATION_NATURALIZATION_REQUIRED: { field: 'naturalizationCertificateNumber', i18nKey: 'errors.reg.naturalizationRequired', action: 'field' },
  REGISTRATION_PERMANENT_ADDRESS_REQUIRED: { field: 'permanentStreetId', i18nKey: 'errors.reg.permanentAddressRequired', action: 'field' },
  REGISTRATION_DECLARATION_REQUIRED: { field: 'confirmed', i18nKey: 'errors.reg.declarationRequired', action: 'field' },
  REGISTRATION_ORGANIZATION_REQUIRED: { field: 'organization', i18nKey: 'errors.reg.organizationRequired', action: 'field' },
  REGISTRATION_DUPLICATE_DOCUMENT: { field: 'attachments', i18nKey: 'errors.reg.duplicateDocument', action: 'field' },
  REGISTRATION_DOCUMENT_NUMBER_EXISTS: { field: 'documentNumber', i18nKey: 'errors.reg.documentNumberExists', action: 'field' },
  REGISTRATION_DOCUMENT_NUMBER_INVALID: { field: 'documentNumber', i18nKey: 'errors.reg.documentNumberInvalid', action: 'field' },
  REGISTRATION_DOCUMENT_TYPE_NOT_ALLOWED: { field: 'attachmentTypeId', i18nKey: 'errors.reg.documentTypeNotAllowed', action: 'field' },
  REGISTRATION_CHILD_INFO_REQUIRED: { field: 'children', i18nKey: 'errors.reg.childInfoRequired', action: 'field' },
  REGISTRATION_MINOR_CANNOT_HAVE_CHILDREN: { field: 'hasChildren', i18nKey: 'errors.reg.minorCannotHaveChildren', action: 'field' },
  REGISTRATION_CHILD_DOB_INVALID: { field: 'children', i18nKey: 'errors.reg.childDobInvalid', action: 'field' },
  REGISTRATION_INVALID_DATE: { i18nKey: 'errors.reg.invalidDate', action: 'toast' },
  DECLARATION_NOT_FOUND: { i18nKey: 'errors.reg.declarationNotFound', action: 'banner' },

  // deprecated REG_* aliases
  REG_SUBJECT_NOT_FOUND: { i18nKey: 'errors.reg.notFound', action: 'banner' },
  REG_SUBJECT_DELETED: { i18nKey: 'errors.reg.deleted', action: 'banner' },
  REG_PHONE_EXISTS: { field: 'phoneNumber', i18nKey: 'errors.reg.phoneExists', action: 'field' },
  REG_INVALID_STATUS: { i18nKey: 'errors.reg.invalidStatus', action: 'banner' },
  REG_ALREADY_APPROVED: { i18nKey: 'errors.reg.alreadyApproved', action: 'banner' },
  REG_CITIZENSHIP_EXISTS: { i18nKey: 'errors.reg.citizenshipExists', action: 'banner' },
  REG_DOC_TYPE_EXISTS: { field: 'attachments', i18nKey: 'errors.reg.duplicateDocument', action: 'field' },
  REG_DOC_NUMBER_EXISTS: { field: 'documentNumber', i18nKey: 'errors.reg.documentNumberExists', action: 'field' },
  REG_ADDRESS_TYPE_EXISTS: { i18nKey: 'errors.reg.addressTypeExists', action: 'banner' },
  REG_PARENT_TYPE_EXISTS: { i18nKey: 'errors.reg.parentTypeExists', action: 'banner' },
  REG_EMERGENCY_ORDER_EXISTS: { field: 'emergencyContacts', i18nKey: 'errors.reg.emergencyOrderExists', action: 'field' },
  REG_NATURALIZATION_REQUIRED: { field: 'naturalizationCertificateNumber', i18nKey: 'errors.reg.naturalizationRequired', action: 'field' },
  REG_DECLARATION_EXISTS: { i18nKey: 'errors.reg.declarationExists', action: 'banner' },

  // VALIDATION (generic)
  VALIDATION_FAILED: { i18nKey: 'errors.validation.failed', action: 'banner' },
  VALIDATION_DOB_FUTURE: { field: 'dateOfBirth', i18nKey: 'errors.validation.dobFuture', action: 'field' },
  VALIDATION_BLANK_FIELD: { i18nKey: 'errors.validation.blankField', action: 'banner' },

  // STAGE 1 - Personal Information
  REGISTRATION_FIRST_NAME_REQUIRED: { field: 'firstName', i18nKey: 'errors.s1.firstNameRequired', action: 'field' },
  REGISTRATION_FIRST_NAME_TOO_LONG: { field: 'firstName', i18nKey: 'errors.s1.firstNameTooLong', action: 'field' },
  REGISTRATION_MIDDLE_NAME_TOO_LONG: { field: 'middleName', i18nKey: 'errors.s1.middleNameTooLong', action: 'field' },
  REGISTRATION_LAST_NAME_REQUIRED: { field: 'lastName', i18nKey: 'errors.s1.lastNameRequired', action: 'field' },
  REGISTRATION_LAST_NAME_TOO_LONG: { field: 'lastName', i18nKey: 'errors.s1.lastNameTooLong', action: 'field' },
  REGISTRATION_SEX_REQUIRED: { field: 'sexId', i18nKey: 'errors.s1.sexRequired', action: 'field' },
  REGISTRATION_DATE_OF_BIRTH_REQUIRED: { field: 'dateOfBirth', i18nKey: 'errors.s1.dobRequired', action: 'field' },
  REGISTRATION_NATIONALITY_CODE_REQUIRED: { field: 'nationalityCode', i18nKey: 'errors.s1.nationalityRequired', action: 'field' },
  REGISTRATION_NATIONALITY_CODE_INVALID: { field: 'nationalityCode', i18nKey: 'errors.s1.nationalityInvalid', action: 'field' },
  REGISTRATION_CITIZENSHIP_TYPE_REQUIRED: { field: 'citizenshipTypeId', i18nKey: 'errors.s1.citizenshipRequired', action: 'field' },
  REGISTRATION_PLACE_OF_BIRTH_STREET_REQUIRED: { field: 'placeOfBirthStreetId', i18nKey: 'errors.s1.pobStreetRequired', action: 'field' },
  REGISTRATION_COUNTRY_OF_BIRTH_REQUIRED: { field: 'countryOfBirth', i18nKey: 'errors.s1.cobRequired', action: 'field' },
  REGISTRATION_COUNTRY_OF_BIRTH_INVALID: { field: 'countryOfBirth', i18nKey: 'errors.s1.cobInvalid', action: 'field' },
  REGISTRATION_CITY_OF_BIRTH_REQUIRED: { field: 'cityOfBirth', i18nKey: 'errors.s1.cityOfBirthRequired', action: 'field' },
  REGISTRATION_CITY_OF_BIRTH_TOO_LONG: { field: 'cityOfBirth', i18nKey: 'errors.s1.cityOfBirthTooLong', action: 'field' },
  REGISTRATION_PHONE_REQUIRED: { field: 'phoneNumber', i18nKey: 'errors.s1.phoneRequired', action: 'field' },
  REGISTRATION_PHONE_INVALID: { field: 'phoneNumber', i18nKey: 'errors.s1.phoneInvalid', action: 'field' },
  REGISTRATION_PHONE_TOO_SHORT: { field: 'phoneNumber', i18nKey: 'errors.s1.phoneTooShort', action: 'field' },
  REGISTRATION_EMAIL_REQUIRED: { field: 'email', i18nKey: 'errors.s1.emailRequired', action: 'field' },
  REGISTRATION_EMAIL_INVALID: { field: 'email', i18nKey: 'errors.s1.emailInvalid', action: 'field' },
  REGISTRATION_EMAIL_TOO_LONG: { field: 'email', i18nKey: 'errors.s1.emailTooLong', action: 'field' },
  REGISTRATION_NAME_INVALID_CHARACTERS: { i18nKey: 'errors.s1.nameInvalidChars', action: 'banner' },
  REGISTRATION_DOB_TOO_OLD: { field: 'dateOfBirth', i18nKey: 'errors.s1.dobTooOld', action: 'field' },
  REGISTRATION_COUNTRY_CODE_UNKNOWN: { i18nKey: 'errors.s1.countryCodeUnknown', action: 'banner' },

  // STAGE 2 - Address
  REGISTRATION_CURRENT_STREET_REQUIRED: { field: 'currentStreetId', i18nKey: 'errors.s2.currentStreetRequired', action: 'field' },
  REGISTRATION_PERMANENT_STREET_REQUIRED: { field: 'permanentStreetId', i18nKey: 'errors.s2.permanentStreetRequired', action: 'field' },
  REGISTRATION_CURRENT_COUNTRY_REQUIRED: { field: 'currentCountry', i18nKey: 'errors.s2.currentCountryRequired', action: 'field' },
  REGISTRATION_CURRENT_COUNTRY_INVALID: { field: 'currentCountry', i18nKey: 'errors.s2.currentCountryInvalid', action: 'field' },
  REGISTRATION_CURRENT_CITY_REQUIRED: { field: 'currentCity', i18nKey: 'errors.s2.currentCityRequired', action: 'field' },
  REGISTRATION_PERMANENT_COUNTRY_REQUIRED: { field: 'permanentCountry', i18nKey: 'errors.s2.permanentCountryRequired', action: 'field' },
  REGISTRATION_PERMANENT_COUNTRY_INVALID: { field: 'permanentCountry', i18nKey: 'errors.s2.permanentCountryInvalid', action: 'field' },
  REGISTRATION_PERMANENT_CITY_REQUIRED: { field: 'permanentCity', i18nKey: 'errors.s2.permanentCityRequired', action: 'field' },
  REGISTRATION_CURRENT_ADDRESS_REQUIRED: { field: 'currentStreetId', i18nKey: 'errors.s2.currentAddressRequired', action: 'field' },

  // STAGE 3 - Parents
  REGISTRATION_FATHER_INFO_REQUIRED: { field: 'father', i18nKey: 'errors.s3.fatherRequired', action: 'field' },
  REGISTRATION_MOTHER_INFO_REQUIRED: { field: 'mother', i18nKey: 'errors.s3.motherRequired', action: 'field' },
  REGISTRATION_PARENT_FIRST_NAME_REQUIRED: { i18nKey: 'errors.s3.firstNameRequired', action: 'banner' },
  REGISTRATION_PARENT_FIRST_NAME_TOO_LONG: { i18nKey: 'errors.s3.firstNameTooLong', action: 'banner' },
  REGISTRATION_PARENT_MIDDLE_NAME_REQUIRED: { i18nKey: 'errors.s3.middleNameRequired', action: 'banner' },
  REGISTRATION_PARENT_MIDDLE_NAME_TOO_LONG: { i18nKey: 'errors.s3.middleNameTooLong', action: 'banner' },
  REGISTRATION_PARENT_LAST_NAME_REQUIRED: { i18nKey: 'errors.s3.lastNameRequired', action: 'banner' },
  REGISTRATION_PARENT_LAST_NAME_TOO_LONG: { i18nKey: 'errors.s3.lastNameTooLong', action: 'banner' },
  REGISTRATION_PARENT_NATIONALITY_REQUIRED: { i18nKey: 'errors.s3.nationalityRequired', action: 'banner' },
  REGISTRATION_PARENT_NATIONALITY_INVALID: { i18nKey: 'errors.s3.nationalityInvalid', action: 'banner' },
  REGISTRATION_PARENT_RESIDENCE_COUNTRY_REQUIRED: { i18nKey: 'errors.s3.residenceCountryRequired', action: 'banner' },
  REGISTRATION_PARENT_RESIDENCE_COUNTRY_INVALID: { i18nKey: 'errors.s3.residenceCountryInvalid', action: 'banner' },
  REGISTRATION_PARENT_RESIDENCE_STREET_REQUIRED: { i18nKey: 'errors.s3.residenceStreetRequired', action: 'banner' },
  REGISTRATION_PARENT_RESIDENCE_CITY_REQUIRED: { i18nKey: 'errors.s3.residenceCityRequired', action: 'banner' },
  REGISTRATION_PARENT_PHONE_INVALID: { i18nKey: 'errors.s3.phoneInvalid', action: 'banner' },
  REGISTRATION_PARENT_AGE_INVALID: { i18nKey: 'errors.s3.ageInvalid', action: 'banner' },

  // STAGE 4 - Education & Employment
  REGISTRATION_EDUCATION_LEVEL_REQUIRED: { i18nKey: 'errors.s4.levelRequired', action: 'banner' },
  REGISTRATION_EDUCATION_COUNTRY_REQUIRED: { i18nKey: 'errors.s4.countryRequired', action: 'banner' },
  REGISTRATION_EDUCATION_COUNTRY_INVALID: { i18nKey: 'errors.s4.countryInvalid', action: 'banner' },
  REGISTRATION_EDUCATION_CITY_REQUIRED: { i18nKey: 'errors.s4.cityRequired', action: 'banner' },
  REGISTRATION_EDUCATION_SCHOOL_REQUIRED: { i18nKey: 'errors.s4.schoolRequired', action: 'banner' },
  REGISTRATION_EDUCATION_REG_NO_REQUIRED: { i18nKey: 'errors.s4.regNoRequired', action: 'banner' },
  REGISTRATION_EDUCATION_YEAR_REQUIRED: { i18nKey: 'errors.s4.yearRequired', action: 'banner' },
  REGISTRATION_EDUCATION_YEAR_INVALID: { i18nKey: 'errors.s4.yearInvalid', action: 'banner' },
  REGISTRATION_EMPLOYMENT_STATUS_REQUIRED: { field: 'employmentStatus', i18nKey: 'errors.s4.statusRequired', action: 'field' },
  REGISTRATION_OCCUPATION_TYPE_REQUIRED: { field: 'occupationTypeId', i18nKey: 'errors.s4.occupationRequired', action: 'field' },
  REGISTRATION_EDUCATION_LEVEL_INVALID: { i18nKey: 'errors.s4.levelInvalid', action: 'banner' },
  REGISTRATION_EMPLOYMENT_STATUS_INVALID: { field: 'employmentStatus', i18nKey: 'errors.s4.statusInvalid', action: 'field' },
  REGISTRATION_OCCUPATION_TYPE_INVALID: { field: 'occupationTypeId', i18nKey: 'errors.s4.occupationInvalid', action: 'field' },
  REGISTRATION_PRIMARY_EDUCATION_REQUIRED: { field: 'educations', i18nKey: 'errors.s4.primaryRequired', action: 'field' },
  REGISTRATION_DUPLICATE_EDUCATION_LEVEL: { field: 'educations', i18nKey: 'errors.s4.duplicateLevel', action: 'field' },
  REGISTRATION_EDUCATION_YEAR_BEFORE_BIRTH: { field: 'educations', i18nKey: 'errors.s4.yearBeforeBirth', action: 'field' },

  // STAGE 5 - Documents & Attachments
  REGISTRATION_ATTACHMENTS_REQUIRED: { field: 'attachments', i18nKey: 'errors.s5.attachmentsRequired', action: 'field' },
  REGISTRATION_ATTACHMENT_TYPE_REQUIRED: { field: 'attachments', i18nKey: 'errors.s5.typeRequired', action: 'field' },
  REGISTRATION_ATTACHMENT_URL_REQUIRED: { field: 'attachments', i18nKey: 'errors.s5.urlRequired', action: 'field' },
  REGISTRATION_ATTACHMENT_TYPE_INVALID: { field: 'attachments', i18nKey: 'errors.s5.typeInvalid', action: 'field' },
  REGISTRATION_ATTACHMENT_MANDATORY_MISSING: { field: 'attachments', i18nKey: 'errors.s5.mandatoryMissing', action: 'field' },
  REGISTRATION_ATTACHMENT_LIMIT_EXCEEDED: { field: 'attachments', i18nKey: 'errors.s5.limitExceeded', action: 'field' },
  REGISTRATION_ATTACHMENT_URL_INVALID: { field: 'attachments', i18nKey: 'errors.s5.urlInvalid', action: 'field' },
  REGISTRATION_DUPLICATE_ATTACHMENT_TYPE: { field: 'attachments', i18nKey: 'errors.s5.duplicateType', action: 'field' },

  // STAGE 6 - Family
  REGISTRATION_MARITAL_STATUS_REQUIRED: { field: 'maritalStatus', i18nKey: 'errors.s6.maritalRequired', action: 'field' },
  REGISTRATION_MARITAL_STATUS_INVALID: { field: 'maritalStatus', i18nKey: 'errors.s6.maritalInvalid', action: 'field' },
  REGISTRATION_SEX_INVALID: { i18nKey: 'errors.s6.sexInvalid', action: 'banner' },
  REGISTRATION_CITIZENSHIP_TYPE_INVALID: { field: 'citizenshipTypeId', i18nKey: 'errors.s1.citizenshipInvalid', action: 'field' },
  REGISTRATION_GENDER_INVALID: { i18nKey: 'errors.s6.genderInvalid', action: 'banner' },
  REGISTRATION_RELATIONSHIP_TYPE_INVALID: { i18nKey: 'errors.s6.relationshipInvalid', action: 'banner' },
  REGISTRATION_SPOUSE_GENDER_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseGenderRequired', action: 'field' },
  REGISTRATION_SPOUSE_GENDER_MISMATCH: { field: 'spouses', i18nKey: 'errors.s6.spouseGenderMismatch', action: 'field' },
  REGISTRATION_EMERGENCY_CONTACTS_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactsRequired', action: 'field' },
  REGISTRATION_CONTACT_LIMIT_EXCEEDED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactsLimit', action: 'field' },
  REGISTRATION_CONTACT_UNDERAGE: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactUnderage', action: 'field' },
  REGISTRATION_CONTACT_DETAILS_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactDetailsRequired', action: 'field' },
  REGISTRATION_RELATIVE_DETAILS_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeDetailsRequired', action: 'field' },
  REGISTRATION_SPOUSE_DETAILS_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseDetailsRequired', action: 'field' },
  REGISTRATION_CONTACT_RELATIONSHIP_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactRelationshipRequired', action: 'field' },
  REGISTRATION_CONTACT_FIRST_NAME_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactFirstNameRequired', action: 'field' },
  REGISTRATION_CONTACT_LAST_NAME_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactLastNameRequired', action: 'field' },
  REGISTRATION_CONTACT_PHONE_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactPhoneRequired', action: 'field' },
  REGISTRATION_CONTACT_PHONE_INVALID: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactPhoneInvalid', action: 'field' },
  REGISTRATION_CONTACT_STREET_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactStreetRequired', action: 'field' },
  REGISTRATION_CONTACT_RESIDENCE_COUNTRY_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactCountryRequired', action: 'field' },
  REGISTRATION_CONTACT_RESIDENCE_COUNTRY_INVALID: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactCountryInvalid', action: 'field' },
  REGISTRATION_CONTACT_RESIDENCE_CITY_REQUIRED: { field: 'emergencyContacts', i18nKey: 'errors.s6.contactCityRequired', action: 'field' },
  REGISTRATION_RELATIVE_COUNT_INVALID: { field: 'relatives', i18nKey: 'errors.s6.relativeCountInvalid', action: 'field' },
  REGISTRATION_RELATIVES_LIMIT_EXCEEDED: { field: 'relatives', i18nKey: 'errors.s6.relativesLimit', action: 'field' },
  REGISTRATION_RELATIVE_RELATIONSHIP_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeRelationshipRequired', action: 'field' },
  REGISTRATION_RELATIVE_FIRST_NAME_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeFirstNameRequired', action: 'field' },
  REGISTRATION_RELATIVE_LAST_NAME_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeLastNameRequired', action: 'field' },
  REGISTRATION_RELATIVE_NATIONALITY_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeNationalityRequired', action: 'field' },
  REGISTRATION_RELATIVE_NATIONALITY_INVALID: { field: 'relatives', i18nKey: 'errors.s6.relativeNationalityInvalid', action: 'field' },
  REGISTRATION_RELATIVE_PHONE_INVALID: { field: 'relatives', i18nKey: 'errors.s6.relativePhoneInvalid', action: 'field' },
  REGISTRATION_RELATIVE_RESIDENCE_COUNTRY_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeCountryRequired', action: 'field' },
  REGISTRATION_RELATIVE_RESIDENCE_COUNTRY_INVALID: { field: 'relatives', i18nKey: 'errors.s6.relativeCountryInvalid', action: 'field' },
  REGISTRATION_RELATIVE_RESIDENCE_STREET_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeStreetRequired', action: 'field' },
  REGISTRATION_RELATIVE_RESIDENCE_CITY_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeCityRequired', action: 'field' },
  REGISTRATION_RELATIVE_DOB_INVALID: { field: 'relatives', i18nKey: 'errors.s6.relativeDobInvalid', action: 'field' },
  REGISTRATION_SPOUSE_INFO_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseInfoRequired', action: 'field' },
  REGISTRATION_SPOUSES_LIMIT_EXCEEDED: { field: 'spouses', i18nKey: 'errors.s6.spousesLimit', action: 'field' },
  REGISTRATION_SPOUSE_DOB_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseDobRequired', action: 'field' },
  REGISTRATION_SPOUSE_FIRST_NAME_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseFirstNameRequired', action: 'field' },
  REGISTRATION_SPOUSE_LAST_NAME_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseLastNameRequired', action: 'field' },
  REGISTRATION_SPOUSE_NATIONALITY_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseNationalityRequired', action: 'field' },
  REGISTRATION_SPOUSE_NATIONALITY_INVALID: { field: 'spouses', i18nKey: 'errors.s6.spouseNationalityInvalid', action: 'field' },
  REGISTRATION_SPOUSE_PHONE_INVALID: { field: 'spouses', i18nKey: 'errors.s6.spousePhoneInvalid', action: 'field' },
  REGISTRATION_SPOUSE_RESIDENCE_COUNTRY_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseCountryRequired', action: 'field' },
  REGISTRATION_SPOUSE_RESIDENCE_COUNTRY_INVALID: { field: 'spouses', i18nKey: 'errors.s6.spouseCountryInvalid', action: 'field' },
  REGISTRATION_SPOUSE_RESIDENCE_STREET_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseStreetRequired', action: 'field' },
  REGISTRATION_SPOUSE_RESIDENCE_CITY_REQUIRED: { field: 'spouses', i18nKey: 'errors.s6.spouseCityRequired', action: 'field' },
  REGISTRATION_SPOUSE_UNDERAGE: { field: 'spouses', i18nKey: 'errors.s6.spouseUnderage', action: 'field' },
  REGISTRATION_RELATIVE_DOB_REQUIRED: { field: 'relatives', i18nKey: 'errors.s6.relativeDobRequired', action: 'field' },
  REGISTRATION_CHILD_FIRST_NAME_REQUIRED: { field: 'children', i18nKey: 'errors.s6.childFirstNameRequired', action: 'field' },
  REGISTRATION_CHILD_LAST_NAME_REQUIRED: { field: 'children', i18nKey: 'errors.s6.childLastNameRequired', action: 'field' },
  REGISTRATION_CHILD_SEX_REQUIRED: { field: 'children', i18nKey: 'errors.s6.childSexRequired', action: 'field' },
  REGISTRATION_CHILD_DOB_REQUIRED: { field: 'children', i18nKey: 'errors.s6.childDobRequired', action: 'field' },
  REGISTRATION_CHILD_NATIONALITY_REQUIRED: { field: 'children', i18nKey: 'errors.s6.childNationalityRequired', action: 'field' },
  REGISTRATION_CHILD_NATIONALITY_INVALID: { field: 'children', i18nKey: 'errors.s6.childNationalityInvalid', action: 'field' },
  REGISTRATION_CHILD_RESIDENCE_REQUIRED: { field: 'children', i18nKey: 'errors.s6.childResidenceRequired', action: 'field' },
  REGISTRATION_CHILDREN_LIMIT_EXCEEDED: { field: 'children', i18nKey: 'errors.s6.childrenLimit', action: 'field' },

  // NATURALIZATION
  REGISTRATION_NATURALIZATION_CERT_REQUIRED: { field: 'naturalizationCertificateNumber', i18nKey: 'errors.s1.natCertRequired', action: 'field' },
  REGISTRATION_NATURALIZATION_PLACE_REQUIRED: { field: 'naturalizationIssuePlace', i18nKey: 'errors.s1.natPlaceRequired', action: 'field' },
  REGISTRATION_NATURALIZATION_DATE_REQUIRED: { field: 'naturalizationIssueDate', i18nKey: 'errors.s1.natDateRequired', action: 'field' },
  REGISTRATION_NATURALIZATION_DATE_FUTURE: { field: 'naturalizationIssueDate', i18nKey: 'errors.s1.natDateFuture', action: 'field' },

  // ADMIN
  ADMIN_REGISTRATION_NOT_FOUND: { i18nKey: 'errors.admin.regNotFound', action: 'banner' },
  ADMIN_INVALID_STATUS_TRANSITION: { i18nKey: 'errors.admin.invalidTransition', action: 'banner' },
  ADMIN_OFFICER_NOT_AUTHORIZED: { i18nKey: 'errors.admin.notAuthorized', action: 'banner' },

  // SYSTEM
  SYSTEM_ERROR: { i18nKey: 'errors.system.unexpected', action: 'banner' },
  SYSTEM_UNAUTHORIZED: { i18nKey: 'errors.system.unauthorized', action: 'redirect-login' },
  SYSTEM_FORBIDDEN: { i18nKey: 'errors.system.forbidden', action: 'banner' },
  SYSTEM_NOT_FOUND: { i18nKey: 'errors.system.notFound', action: 'banner' },
  SYSTEM_METHOD_NOT_ALLOWED: { i18nKey: 'errors.system.methodNotAllowed', action: 'banner' },
};

export const DEFAULT_ERROR: ErrorMapping = {
  i18nKey: 'errors.system.unexpected',
  action: 'banner',
};

export function resolveApiError(errorCode: string | undefined): ErrorMapping {
  if (!errorCode) return DEFAULT_ERROR;
  return ERROR_CODE_MAP[errorCode] ?? DEFAULT_ERROR;
}
