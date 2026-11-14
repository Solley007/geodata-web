import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Users, Shield, Lock, Building2, UserCog, ShieldCheck, Clock, Handshake, BookOpen, Briefcase } from "lucide-react";
import UsersTab from "./_components/iam/UsersTab.tsx";
import PartnersUsersSubTab from "./_components/iam/PartnersUsersSubTab.tsx";
import RolesTab from "./_components/iam/RolesTab.tsx";
import PermissionsTab from "./_components/iam/PermissionsTab.tsx";
import OrganizationTab from "./_components/iam/OrganizationTab.tsx";
import UserAssignmentsTab from "./_components/iam/UserAssignmentsTab.tsx";
import ApprovalsSodTab from "./_components/iam/ApprovalsSodTab.tsx";
import TemporaryAccessTab from "./_components/iam/TemporaryAccessTab.tsx";
import PartnersTab from "./_components/iam/PartnersTab.tsx";
import GuideTab from "./_components/iam/GuideTab.tsx";

/**
 * Central Identity, Access & Organisation control centre.
 * Upgrades the existing /admin/users page — never a separate /admin/rbac.
 * Preserves the original Users tab exactly; adds Roles, Permissions, and
 * Organisation as additional configurable layers on top.
 */
export default function AdminUsers() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
          Users & Roles
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Central identity, access, and organisation control centre
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="users" className="gap-1.5"><Users size={13} /> Users</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield size={13} /> Roles</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5"><Lock size={13} /> Permissions</TabsTrigger>
          <TabsTrigger value="organization" className="gap-1.5"><Building2 size={13} /> Organisation</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5"><UserCog size={13} /> Assignments</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5"><ShieldCheck size={13} /> Approvals &amp; SoD</TabsTrigger>
          <TabsTrigger value="temporary" className="gap-1.5"><Clock size={13} /> Temp Access</TabsTrigger>
          <TabsTrigger value="partners" className="gap-1.5"><Handshake size={13} /> Strategic Partners</TabsTrigger>
          <TabsTrigger value="guide" className="gap-1.5"><BookOpen size={13} /> Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Tabs defaultValue="staff">
            <TabsList className="w-full sm:w-auto flex-wrap h-auto" variant="line">
              <TabsTrigger value="staff" className="gap-1.5"><Briefcase size={13} /> Staff</TabsTrigger>
              <TabsTrigger value="clients" className="gap-1.5"><Users size={13} /> Clients</TabsTrigger>
              <TabsTrigger value="partners" className="gap-1.5"><Handshake size={13} /> Partners</TabsTrigger>
            </TabsList>
            <TabsContent value="staff" className="mt-4">
              <UsersTab audience="staff" />
            </TabsContent>
            <TabsContent value="clients" className="mt-4">
              <UsersTab audience="client" />
            </TabsContent>
            <TabsContent value="partners" className="mt-4">
              <PartnersUsersSubTab />
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesTab />
        </TabsContent>
        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab />
        </TabsContent>
        <TabsContent value="organization" className="mt-4">
          <OrganizationTab />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <UserAssignmentsTab />
        </TabsContent>
        <TabsContent value="approvals" className="mt-4">
          <ApprovalsSodTab />
        </TabsContent>
        <TabsContent value="temporary" className="mt-4">
          <TemporaryAccessTab />
        </TabsContent>
        <TabsContent value="partners" className="mt-4">
          <PartnersTab />
        </TabsContent>
        <TabsContent value="guide" className="mt-4">
          <GuideTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
