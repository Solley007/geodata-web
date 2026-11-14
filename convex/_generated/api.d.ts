/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as allocations from "../allocations.js";
import type * as backup from "../backup.js";
import type * as backupDestinations from "../backupDestinations.js";
import type * as backupInternal from "../backupInternal.js";
import type * as buyer from "../buyer.js";
import type * as clients from "../clients.js";
import type * as cms from "../cms.js";
import type * as communications from "../communications.js";
import type * as construction from "../construction.js";
import type * as corporateDirectory from "../corporateDirectory.js";
import type * as corporateMarketing_acknowledgements from "../corporateMarketing/acknowledgements.js";
import type * as corporateMarketing_activities from "../corporateMarketing/activities.js";
import type * as corporateMarketing_allocationBatches from "../corporateMarketing/allocationBatches.js";
import type * as corporateMarketing_analytics from "../corporateMarketing/analytics.js";
import type * as corporateMarketing_bulkAcquisitions from "../corporateMarketing/bulkAcquisitions.js";
import type * as corporateMarketing_campaigns from "../corporateMarketing/campaigns.js";
import type * as corporateMarketing_commercialTerms from "../corporateMarketing/commercialTerms.js";
import type * as corporateMarketing_commitments from "../corporateMarketing/commitments.js";
import type * as corporateMarketing_config from "../corporateMarketing/config.js";
import type * as corporateMarketing_contacts from "../corporateMarketing/contacts.js";
import type * as corporateMarketing_deliveries from "../corporateMarketing/deliveries.js";
import type * as corporateMarketing_eois from "../corporateMarketing/eois.js";
import type * as corporateMarketing_esignature from "../corporateMarketing/esignature.js";
import type * as corporateMarketing_exceptions from "../corporateMarketing/exceptions.js";
import type * as corporateMarketing_feature from "../corporateMarketing/feature.js";
import type * as corporateMarketing_followups from "../corporateMarketing/followups.js";
import type * as corporateMarketing_letters from "../corporateMarketing/letters.js";
import type * as corporateMarketing_lineItems from "../corporateMarketing/lineItems.js";
import type * as corporateMarketing_meetings from "../corporateMarketing/meetings.js";
import type * as corporateMarketing_negotiations from "../corporateMarketing/negotiations.js";
import type * as corporateMarketing_opportunities from "../corporateMarketing/opportunities.js";
import type * as corporateMarketing_organisations from "../corporateMarketing/organisations.js";
import type * as corporateMarketing_paymentSchedules from "../corporateMarketing/paymentSchedules.js";
import type * as corporateMarketing_proposals from "../corporateMarketing/proposals.js";
import type * as corporateMarketing_refs from "../corporateMarketing/refs.js";
import type * as corporateMarketing_sharedHelpers from "../corporateMarketing/sharedHelpers.js";
import type * as crons from "../crons.js";
import type * as developments from "../developments.js";
import type * as diaspora_analytics from "../diaspora/analytics.js";
import type * as diaspora_campaigns from "../diaspora/campaigns.js";
import type * as diaspora_consultations from "../diaspora/consultations.js";
import type * as diaspora_content from "../diaspora/content.js";
import type * as diaspora_corporate from "../diaspora/corporate.js";
import type * as diaspora_ctas from "../diaspora/ctas.js";
import type * as diaspora_feature from "../diaspora/feature.js";
import type * as diaspora_followUps from "../diaspora/followUps.js";
import type * as diaspora_leads from "../diaspora/leads.js";
import type * as diaspora_markets from "../diaspora/markets.js";
import type * as diaspora_programmes from "../diaspora/programmes.js";
import type * as diaspora_properties from "../diaspora/properties.js";
import type * as diaspora_qr from "../diaspora/qr.js";
import type * as documents from "../documents.js";
import type * as docvault from "../docvault.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as emails from "../emails.js";
import type * as enhancedDocuments from "../enhancedDocuments.js";
import type * as esignature from "../esignature.js";
import type * as estamp from "../estamp.js";
import type * as featureToggles from "../featureToggles.js";
import type * as finance from "../finance.js";
import type * as fx from "../fx.js";
import type * as fxUtils from "../fxUtils.js";
import type * as gallery from "../gallery.js";
import type * as gateway from "../gateway.js";
import type * as guides from "../guides.js";
import type * as http from "../http.js";
import type * as iam_access from "../iam/access.js";
import type * as iam_approvalAuthority from "../iam/approvalAuthority.js";
import type * as iam_dashboard from "../iam/dashboard.js";
import type * as iam_organization from "../iam/organization.js";
import type * as iam_partnerEngagements from "../iam/partnerEngagements.js";
import type * as iam_permissions from "../iam/permissions.js";
import type * as iam_roles from "../iam/roles.js";
import type * as iam_scope from "../iam/scope.js";
import type * as iam_sod from "../iam/sod.js";
import type * as iam_staffPortal from "../iam/staffPortal.js";
import type * as iam_temporaryAccess from "../iam/temporaryAccess.js";
import type * as iam_userAssignments from "../iam/userAssignments.js";
import type * as inquiries from "../inquiries.js";
import type * as internalComms from "../internalComms.js";
import type * as kyc from "../kyc.js";
import type * as liveInspections from "../liveInspections.js";
import type * as notifications from "../notifications.js";
import type * as partnerContractEmails from "../partnerContractEmails.js";
import type * as partnerContractUtils from "../partnerContractUtils.js";
import type * as partnerContracts from "../partnerContracts.js";
import type * as partnerProfiles from "../partnerProfiles.js";
import type * as partners from "../partners.js";
import type * as payments from "../payments.js";
import type * as properties from "../properties.js";
import type * as propertyTours from "../propertyTours.js";
import type * as publicDocuments from "../publicDocuments.js";
import type * as reporting from "../reporting.js";
import type * as sales from "../sales.js";
import type * as schema_partnerProfile from "../schema/partnerProfile.js";
import type * as search from "../search.js";
import type * as sitemap from "../sitemap.js";
import type * as staff from "../staff.js";
import type * as staffLetters from "../staffLetters.js";
import type * as staffPortal_attendanceAndLeave from "../staffPortal/attendanceAndLeave.js";
import type * as staffPortal_clientsAndInquiries from "../staffPortal/clientsAndInquiries.js";
import type * as staffPortal_performance from "../staffPortal/performance.js";
import type * as staffPortal_propertiesAndSales from "../staffPortal/propertiesAndSales.js";
import type * as taskboard from "../taskboard.js";
import type * as teams_access from "../teams/access.js";
import type * as teams_messages from "../teams/messages.js";
import type * as teams_teams from "../teams/teams.js";
import type * as trackRecord from "../trackRecord.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as whatsapp from "../whatsapp.js";
import type * as whatsappSettings from "../whatsappSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  allocations: typeof allocations;
  backup: typeof backup;
  backupDestinations: typeof backupDestinations;
  backupInternal: typeof backupInternal;
  buyer: typeof buyer;
  clients: typeof clients;
  cms: typeof cms;
  communications: typeof communications;
  construction: typeof construction;
  corporateDirectory: typeof corporateDirectory;
  "corporateMarketing/acknowledgements": typeof corporateMarketing_acknowledgements;
  "corporateMarketing/activities": typeof corporateMarketing_activities;
  "corporateMarketing/allocationBatches": typeof corporateMarketing_allocationBatches;
  "corporateMarketing/analytics": typeof corporateMarketing_analytics;
  "corporateMarketing/bulkAcquisitions": typeof corporateMarketing_bulkAcquisitions;
  "corporateMarketing/campaigns": typeof corporateMarketing_campaigns;
  "corporateMarketing/commercialTerms": typeof corporateMarketing_commercialTerms;
  "corporateMarketing/commitments": typeof corporateMarketing_commitments;
  "corporateMarketing/config": typeof corporateMarketing_config;
  "corporateMarketing/contacts": typeof corporateMarketing_contacts;
  "corporateMarketing/deliveries": typeof corporateMarketing_deliveries;
  "corporateMarketing/eois": typeof corporateMarketing_eois;
  "corporateMarketing/esignature": typeof corporateMarketing_esignature;
  "corporateMarketing/exceptions": typeof corporateMarketing_exceptions;
  "corporateMarketing/feature": typeof corporateMarketing_feature;
  "corporateMarketing/followups": typeof corporateMarketing_followups;
  "corporateMarketing/letters": typeof corporateMarketing_letters;
  "corporateMarketing/lineItems": typeof corporateMarketing_lineItems;
  "corporateMarketing/meetings": typeof corporateMarketing_meetings;
  "corporateMarketing/negotiations": typeof corporateMarketing_negotiations;
  "corporateMarketing/opportunities": typeof corporateMarketing_opportunities;
  "corporateMarketing/organisations": typeof corporateMarketing_organisations;
  "corporateMarketing/paymentSchedules": typeof corporateMarketing_paymentSchedules;
  "corporateMarketing/proposals": typeof corporateMarketing_proposals;
  "corporateMarketing/refs": typeof corporateMarketing_refs;
  "corporateMarketing/sharedHelpers": typeof corporateMarketing_sharedHelpers;
  crons: typeof crons;
  developments: typeof developments;
  "diaspora/analytics": typeof diaspora_analytics;
  "diaspora/campaigns": typeof diaspora_campaigns;
  "diaspora/consultations": typeof diaspora_consultations;
  "diaspora/content": typeof diaspora_content;
  "diaspora/corporate": typeof diaspora_corporate;
  "diaspora/ctas": typeof diaspora_ctas;
  "diaspora/feature": typeof diaspora_feature;
  "diaspora/followUps": typeof diaspora_followUps;
  "diaspora/leads": typeof diaspora_leads;
  "diaspora/markets": typeof diaspora_markets;
  "diaspora/programmes": typeof diaspora_programmes;
  "diaspora/properties": typeof diaspora_properties;
  "diaspora/qr": typeof diaspora_qr;
  documents: typeof documents;
  docvault: typeof docvault;
  emailTemplates: typeof emailTemplates;
  emails: typeof emails;
  enhancedDocuments: typeof enhancedDocuments;
  esignature: typeof esignature;
  estamp: typeof estamp;
  featureToggles: typeof featureToggles;
  finance: typeof finance;
  fx: typeof fx;
  fxUtils: typeof fxUtils;
  gallery: typeof gallery;
  gateway: typeof gateway;
  guides: typeof guides;
  http: typeof http;
  "iam/access": typeof iam_access;
  "iam/approvalAuthority": typeof iam_approvalAuthority;
  "iam/dashboard": typeof iam_dashboard;
  "iam/organization": typeof iam_organization;
  "iam/partnerEngagements": typeof iam_partnerEngagements;
  "iam/permissions": typeof iam_permissions;
  "iam/roles": typeof iam_roles;
  "iam/scope": typeof iam_scope;
  "iam/sod": typeof iam_sod;
  "iam/staffPortal": typeof iam_staffPortal;
  "iam/temporaryAccess": typeof iam_temporaryAccess;
  "iam/userAssignments": typeof iam_userAssignments;
  inquiries: typeof inquiries;
  internalComms: typeof internalComms;
  kyc: typeof kyc;
  liveInspections: typeof liveInspections;
  notifications: typeof notifications;
  partnerContractEmails: typeof partnerContractEmails;
  partnerContractUtils: typeof partnerContractUtils;
  partnerContracts: typeof partnerContracts;
  partnerProfiles: typeof partnerProfiles;
  partners: typeof partners;
  payments: typeof payments;
  properties: typeof properties;
  propertyTours: typeof propertyTours;
  publicDocuments: typeof publicDocuments;
  reporting: typeof reporting;
  sales: typeof sales;
  "schema/partnerProfile": typeof schema_partnerProfile;
  search: typeof search;
  sitemap: typeof sitemap;
  staff: typeof staff;
  staffLetters: typeof staffLetters;
  "staffPortal/attendanceAndLeave": typeof staffPortal_attendanceAndLeave;
  "staffPortal/clientsAndInquiries": typeof staffPortal_clientsAndInquiries;
  "staffPortal/performance": typeof staffPortal_performance;
  "staffPortal/propertiesAndSales": typeof staffPortal_propertiesAndSales;
  taskboard: typeof taskboard;
  "teams/access": typeof teams_access;
  "teams/messages": typeof teams_messages;
  "teams/teams": typeof teams_teams;
  trackRecord: typeof trackRecord;
  transactions: typeof transactions;
  users: typeof users;
  whatsapp: typeof whatsapp;
  whatsappSettings: typeof whatsappSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
