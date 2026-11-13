import React, { useState } from 'react';
import { User, Household, Membership, MeetingTopic, HouseAgreement, JoinRequest } from '../../types';
import { sound } from '../../services/sound';
import { getCurrencySymbol } from '../../utils/stateTable';
import { ChatCircleDots, UsersThree } from '@phosphor-icons/react';
import { ApartmentHeaderCard } from './components/ApartmentHeaderCard';
import { RoomiesRoster } from './components/RoomiesRoster';
import { HouseDiscussionsAndRules } from './components/HouseDiscussionsAndRules';
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
}) => {
  const sym = getCurrencySymbol(household?.currency);

  const [mobileTab, setMobileTab] = useState<'roomies' | 'meetings'>('roomies');
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [removeTargetUser, setRemoveTargetUser] = useState<User | null>(null);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [addAgreementModalOpen, setAddAgreementModalOpen] = useState(false);

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
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#E6E8EE]/70">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setMobileTab('roomies');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-all cursor-pointer ${
              mobileTab === 'roomies'
                ? 'bg-white text-[#1F2430] shadow-sm'
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
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-heading font-black transition-all cursor-pointer ${
              mobileTab === 'meetings'
                ? 'bg-white text-[#1F2430] shadow-sm'
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
    </div>
  );
};
