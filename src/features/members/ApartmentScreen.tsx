import React, { useState, useEffect } from 'react';
import {
  User,
  Household,
  Membership,
  MeetingTopic,
  HouseAgreement,
  JoinRequest,
  HouseholdInfoCard,
  LandlordProfile,
  MaintenanceIssue,
  MoveInSnapshot,
  MoveOutInspection,
  MaintenanceIssueStatus,
} from '../../types';
import { sound } from '../../services/sound';
import { api } from '../../services/api';
import { localCache } from '../../services/localCache';
import { getCurrencySymbol } from '../../utils/stateTable';
import { ChatCircleDots, UsersThree } from '@phosphor-icons/react';
import { ApartmentHeaderCard } from './components/ApartmentHeaderCard';
import { RoomiesRoster } from './components/RoomiesRoster';
import { HouseDiscussionsAndRules } from './components/HouseDiscussionsAndRules';
import { ApartmentInfoCard } from './components/ApartmentInfoCard';
import { LandlordHubCard } from './components/LandlordHubCard';
import { MoveInSnapshotModal } from './components/MoveInSnapshotModal';
import { MoveOutSnapshotModal } from './components/MoveOutSnapshotModal';
import { MaintenanceIssueModal } from './components/MaintenanceIssueModal';
import { ExportAgreementPdfModal } from './components/ExportAgreementPdfModal';
import {
  ProposeTopicModal,
  AddAgreementModal,
  HandoverAdminModal,
  LeaveApartmentModal,
  RemoveMemberModal,
} from './components/ApartmentModals';

interface ApartmentScreenProps {
  household: Household;
  members: { user: User; membership: Membership }[];
  currentUser: User;
  netBalance: number;
  topics: MeetingTopic[];
  agreements: HouseAgreement[];
  roommates: User[];
  joinRequests?: JoinRequest[];
  onReviewJoinRequest?: (req: JoinRequest) => void;
  onShowQR: () => void;
  onHandoverAdmin: (toUserId: string) => Promise<void>;
  onRemoveMember?: (userId: string) => Promise<void>;
  onLeaveHousehold: () => Promise<void>;
  onCreateTopic: (title: string, desc: string) => Promise<MeetingTopic>;
  onVoteTopic: (topicId: string, vote: 'agree' | 'disagree' | 'neutral') => Promise<void>;
  onAddComment: (topicId: string, text: string) => Promise<void>;
  onAddAgreement: (text: string, category: string) => Promise<HouseAgreement>;
  onOpenHouseholdSwitcher?: () => void;
  onOpenHowItWorks?: () => void;
  infoCard?: HouseholdInfoCard | null;
  onUpdateInfoCard?: (params: {
    wifiSsid?: string;
    wifiPassword?: string;
    trashSchedule?: string;
    deliveryAddress?: string;
    emergencyNote?: string;
  }) => Promise<void>;
}

export const ApartmentScreen: React.FC<ApartmentScreenProps> = ({
  household,
  members,
  currentUser,
  netBalance,
  topics,
  agreements,
  roommates,
  joinRequests,
  onReviewJoinRequest,
  onShowQR,
  onHandoverAdmin,
  onRemoveMember,
  onLeaveHousehold,
  onCreateTopic,
  onVoteTopic,
  onAddComment,
  onAddAgreement,
  onOpenHouseholdSwitcher,
  onOpenHowItWorks,
  infoCard,
  onUpdateInfoCard,
}) => {
  const sym = getCurrencySymbol(household?.currency);

  const [mobileTab, setMobileTab] = useState<'roomies' | 'meetings'>('roomies');
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [removeTargetUser, setRemoveTargetUser] = useState<User | null>(null);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [addAgreementModalOpen, setAddAgreementModalOpen] = useState(false);

  const [activeInfoCard, setActiveInfoCard] = useState<HouseholdInfoCard | null>(
    () => infoCard || localCache.getSnapshot(household?.id)?.infoCard || null
  );

  const [landlordProfile, setLandlordProfile] = useState<LandlordProfile | null>(() => {
    return (
      localCache.getSnapshot(household?.id)?.landlordProfile ||
      api.store.landlordProfiles?.[household?.id] ||
      null
    );
  });

  const [maintenanceIssues, setMaintenanceIssues] = useState<MaintenanceIssue[]>(() => {
    return (
      localCache.getSnapshot(household?.id)?.maintenanceIssues ||
      api.store.maintenanceIssues?.[household?.id] ||
      []
    );
  });

  const [snapshots, setSnapshots] = useState<MoveInSnapshot[]>(() => {
    return (
      localCache.getSnapshot(household?.id)?.moveInSnapshots ||
      api.store.moveInSnapshots?.[household?.id] ||
      []
    );
  });

  const [moveOutInspections, setMoveOutInspections] = useState<MoveOutInspection[]>(() => {
    return (
      api.store.moveOutInspections?.[household?.id] ||
      []
    );
  });

  const [moveInModalOpen, setMoveInModalOpen] = useState(false);
  const [moveOutModalOpen, setMoveOutModalOpen] = useState(false);
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MaintenanceIssue | null>(null);
  const [exportPdfModalOpen, setExportPdfModalOpen] = useState(false);

  useEffect(() => {
    if (infoCard !== undefined) {
      setActiveInfoCard(infoCard);
    } else if (household?.id) {
      const snap = localCache.getSnapshot(household.id);
      if (snap?.infoCard) {
        setActiveInfoCard(snap.infoCard);
      }
      api.shopping
        .getHouseholdInfoCard(household.id)
        .then((card) => {
          if (card) setActiveInfoCard(card);
        })
        .catch(() => {});
    }

    if (household?.id) {
      api.flatUtilities
        .getLandlordProfile(household.id)
        .then((prof) => {
          if (prof) setLandlordProfile(prof);
        })
        .catch(() => {});

      api.flatUtilities
        .getMaintenanceIssues(household.id)
        .then((issues) => {
          if (issues) setMaintenanceIssues(issues);
        })
        .catch(() => {});

      api.flatUtilities
        .getMoveInSnapshots(household.id)
        .then((snaps) => {
          if (snaps) setSnapshots(snaps);
        })
        .catch(() => {});

      api.tenantTransition
        .getMoveOutInspections(household.id)
        .then((inspections) => {
          if (inspections) setMoveOutInspections(inspections);
        })
        .catch(() => {});
    }
  }, [household?.id, infoCard]);

  const handleUpdateLandlordProfile = async (params: {
    householdId: string;
    landlordName: string;
    roleLabel: string;
    phoneOrWhatsapp: string;
    emergencyNote?: string;
  }) => {
    const updated = await api.flatUtilities.updateLandlordProfile(params);
    setLandlordProfile(updated);
    return updated;
  };

  const handleReportIssue = async (params: {
    householdId: string;
    title: string;
    description: string;
    photoUrls?: string[];
  }) => {
    const issue = await api.flatUtilities.reportMaintenanceIssue(params);
    setMaintenanceIssues((prev) => [issue, ...prev]);
    return issue;
  };

  const handleUpdateIssueStatus = async (
    issueId: string,
    status: MaintenanceIssueStatus
  ) => {
    const updated = await api.flatUtilities.updateMaintenanceIssueStatus(issueId, status);
    if (updated) {
      setMaintenanceIssues((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
    }
    return updated;
  };

  const handleAddSnapshot = async (params: {
    householdId: string;
    roomName: string;
    conditionNote: string;
    photoUrls?: string[];
  }) => {
    const snap = await api.flatUtilities.addMoveInSnapshot(params);
    setSnapshots((prev) => [snap, ...prev]);
    return snap;
  };

  const handleConfirmSnapshot = async (snapshotId: string, userId: string) => {
    const updated = await api.flatUtilities.confirmMoveInSnapshot(snapshotId, userId);
    if (updated) {
      setSnapshots((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    }
    return updated;
  };

  const handleAddInspection = async (
    params: Parameters<typeof api.tenantTransition.addMoveOutInspection>[0]
  ) => {
    const inspection = await api.tenantTransition.addMoveOutInspection(params);
    setMoveOutInspections((prev) => [inspection, ...prev]);
    return inspection;
  };

  const handleConfirmInspection = async (inspectionId: string, userId?: string) => {
    const ok = await api.tenantTransition.confirmMoveOutInspection(inspectionId, userId);
    if (ok) {
      setMoveOutInspections((prev) =>
        prev.map((i) => {
          if (i.id !== inspectionId) return i;
          const uId = userId || currentUser.id;
          const newConfirmed = Array.from(new Set([...i.confirmedByUserIds, uId]));
          return {
            ...i,
            confirmedByUserIds: newConfirmed,
            status: newConfirmed.length >= 2 ? 'agreed' : i.status,
          };
        })
      );
    }
    return ok;
  };

  const handleSettleRefund = async (inspectionId: string, adminPayerUserId?: string) => {
    const res = await api.tenantTransition.settleDepositRefund(inspectionId, adminPayerUserId);
    if (res.success) {
      setMoveOutInspections((prev) =>
        prev.map((i) =>
          i.id === inspectionId
            ? {
                ...i,
                status: 'settled',
                settlementExpenseId: res.expenseId || i.settlementExpenseId,
              }
            : i
        )
      );
    }
    return res;
  };

  const handleUpdateInfoCard = async (params: {
    wifiSsid?: string;
    wifiPassword?: string;
    trashSchedule?: string;
    deliveryAddress?: string;
    emergencyNote?: string;
  }) => {
    if (onUpdateInfoCard) {
      await onUpdateInfoCard(params);
    } else if (household?.id) {
      const res = await api.shopping.updateHouseholdInfoCard({
        ...params,
        householdId: household.id,
      });
      if (res.card) {
        setActiveInfoCard(res.card);
      }
    }
  };

  const currentMembership = members.find((m) => m.user.id === currentUser.id)?.membership;
  const isAdmin = currentMembership?.role === 'admin';

  return (
    <div className="w-full select-none pb-28 md:pb-8">
      <ApartmentHeaderCard
        household={household}
        isAdmin={isAdmin}
        memberCount={members.length}
        joinRequests={joinRequests}
        onShowQR={onShowQR}
        onOpenHouseholdSwitcher={onOpenHouseholdSwitcher}
        onOpenHowItWorks={onOpenHowItWorks}
        onOpenHandoverModal={() => setHandoverModalOpen(true)}
        onReviewJoinRequest={onReviewJoinRequest}
      />

      <div className="lg:hidden mb-5">
        <div className="relative grid grid-cols-2 p-1.5 rounded-2xl bg-[#E6E8EE]/70">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] rounded-xl bg-white shadow-sm transition-transform duration-250 ease-spring will-change-transform motion-reduce:transition-none"
            style={{
              transform:
                mobileTab === 'roomies'
                  ? 'translate3d(0%, 0, 0)'
                  : 'translate3d(100%, 0, 0)',
            }}
          />
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setMobileTab('roomies');
            }}
            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-colors duration-150 cursor-pointer ${
              mobileTab === 'roomies'
                ? 'text-[#1F2430]'
                : 'text-[#475569] hover:text-[#1F2430]'
            }`}
          >
            <UsersThree className="w-4 h-4" weight={mobileTab === 'roomies' ? 'fill' : 'duotone'} />
            <span>Roomies ({members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setMobileTab('meetings');
            }}
            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-colors duration-150 cursor-pointer ${
              mobileTab === 'meetings'
                ? 'text-[#1F2430]'
                : 'text-[#475569] hover:text-[#1F2430]'
            }`}
          >
            <ChatCircleDots className="w-4 h-4" weight={mobileTab === 'meetings' ? 'fill' : 'duotone'} />
            <span>Rules & Meetings ({topics.length + agreements.length})</span>
          </button>
        </div>
      </div>

      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <div
          className={`w-full lg:col-span-7 self-start ${
            mobileTab === 'roomies' ? 'block' : 'hidden lg:block'
          }`}
        >
          <RoomiesRoster
            members={members}
            currentUser={currentUser}
            isAdmin={isAdmin}
            canRemoveMembers={Boolean(onRemoveMember)}
            onSelectRemoveUser={setRemoveTargetUser}
            onOpenLeaveModal={() => setLeaveModalOpen(true)}
          />
        </div>

        <div
          className={`w-full lg:col-span-5 self-start h-fit space-y-6 lg:sticky lg:top-0 mt-6 lg:mt-0 ${
            mobileTab === 'meetings' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ApartmentInfoCard
            infoCard={activeInfoCard}
            onUpdateInfoCard={handleUpdateInfoCard}
          />
          <LandlordHubCard
            landlordProfile={landlordProfile}
            maintenanceIssues={maintenanceIssues}
            householdId={household?.id || 'h_main'}
            onUpdateProfile={handleUpdateLandlordProfile}
            onOpenReportIssue={() => {
              setSelectedIssue(null);
              setMaintModalOpen(true);
            }}
            onSelectIssue={(issue) => {
              setSelectedIssue(issue);
              setMaintModalOpen(true);
            }}
            onOpenMoveInSnapshot={() => setMoveInModalOpen(true)}
            onOpenMoveOutSnapshot={() => setMoveOutModalOpen(true)}
            onOpenExportPdf={() => setExportPdfModalOpen(true)}
          />
          <HouseDiscussionsAndRules
            topics={topics}
            agreements={agreements}
            roommates={roommates}
            currentUser={currentUser}
            onOpenProposeModal={() => setProposeModalOpen(true)}
            onOpenAddAgreementModal={() => setAddAgreementModalOpen(true)}
            onVoteTopic={onVoteTopic}
            onAddComment={onAddComment}
          />
        </div>
      </div>

      <ProposeTopicModal
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        onCreateTopic={onCreateTopic}
      />

      <AddAgreementModal
        isOpen={addAgreementModalOpen}
        onClose={() => setAddAgreementModalOpen(false)}
        onAddAgreement={onAddAgreement}
      />

      <HandoverAdminModal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        members={members}
        currentUserId={currentUser.id}
        onHandoverAdmin={onHandoverAdmin}
      />

      <LeaveApartmentModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        netBalance={netBalance}
        currencySymbol={sym}
        onLeaveHousehold={onLeaveHousehold}
      />

      <RemoveMemberModal
        targetUser={removeTargetUser}
        onClose={() => setRemoveTargetUser(null)}
        onRemoveMember={onRemoveMember}
      />

      {moveInModalOpen && (
        <MoveInSnapshotModal
          isOpen={moveInModalOpen}
          onClose={() => setMoveInModalOpen(false)}
          household={household}
          snapshots={snapshots}
          roommates={roommates}
          currentUser={currentUser}
          onAddSnapshot={handleAddSnapshot}
          onConfirmSnapshot={handleConfirmSnapshot}
          onOpenExport={() => setExportPdfModalOpen(true)}
        />
      )}

      {moveOutModalOpen && (
        <MoveOutSnapshotModal
          isOpen={moveOutModalOpen}
          onClose={() => setMoveOutModalOpen(false)}
          household={household}
          moveOutInspections={moveOutInspections}
          moveInSnapshots={snapshots}
          roommates={roommates}
          currentUser={currentUser}
          onAddInspection={handleAddInspection}
          onConfirmInspection={handleConfirmInspection}
          onSettleRefund={handleSettleRefund}
        />
      )}

      {maintModalOpen && (
        <MaintenanceIssueModal
          isOpen={maintModalOpen}
          onClose={() => {
            setMaintModalOpen(false);
            setSelectedIssue(null);
          }}
          householdId={household?.id || 'h_main'}
          currentUser={currentUser}
          existingIssue={selectedIssue}
          onReportIssue={handleReportIssue}
          onUpdateStatus={handleUpdateIssueStatus}
        />
      )}

      {exportPdfModalOpen && (
        <ExportAgreementPdfModal
          isOpen={exportPdfModalOpen}
          onClose={() => setExportPdfModalOpen(false)}
          household={household}
          agreements={agreements}
          snapshots={snapshots}
          members={roommates}
        />
      )}
    </div>
  );
};
