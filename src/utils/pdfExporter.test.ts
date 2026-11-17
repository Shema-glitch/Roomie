import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAgreementsHtml,
  generateConditionSnapshotHtml,
  generateMoveOutCertificateHtml,
} from './pdfExporter';
import { Household, User, HouseAgreement, MoveInSnapshot, MoveOutInspection } from '../types';

describe('pdfExporter', () => {
  const mockHousehold: Household = {
    id: 'h_test',
    name: 'Sunny Flat Lefkoşa',
    currency: 'TRY',
    inviteCode: 'SUNNY99',
    createdBy: 'u1',
    settings: {
      rotationInterval: 'weekly',
      rotatingAdmin: false,
      quietHours: '23:00 - 08:00',
    },
    createdAt: '2026-09-01T00:00:00Z',
  };

  const mockMembers: User[] = [
    {
      id: 'u1',
      name: 'Kai Tanaka',
      email: 'kai@example.com',
      avatar: '',
      country: 'Japan',
      countryCode: 'JP',
      flag: '🇯🇵',
      isHome: true,
      streakDays: 5,
      points: 100,
      awayUntil: null,
    },
    {
      id: 'u2',
      name: 'Amina Mansour',
      email: 'amina@example.com',
      avatar: '',
      country: 'Morocco',
      countryCode: 'MA',
      flag: '🇲🇦',
      isHome: true,
      streakDays: 8,
      points: 120,
      awayUntil: null,
    },
  ];

  const mockAgreements: HouseAgreement[] = [
    {
      id: 'a1',
      householdId: 'h_test',
      text: 'Quiet hours after 23:00 on weekdays.',
      category: 'Noise & Guests',
      agreedAt: '2026-09-05T00:00:00Z',
    },
  ];

  const mockSnapshots: MoveInSnapshot[] = [
    {
      id: 's1',
      householdId: 'h_test',
      roomName: 'Living Room',
      conditionNote: 'Sofa and wooden table in clean state.',
      photoUrls: ['https://example.com/photo.jpg'],
      createdBy: 'u1',
      confirmedByUserIds: ['u1', 'u2'],
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-01T12:00:00Z',
      version: 1,
    },
  ];

  it('generates valid house agreements HTML markup', () => {
    const html = generateAgreementsHtml({
      household: mockHousehold,
      agreements: mockAgreements,
      members: mockMembers,
    });

    assert.ok(html.includes('Sunny Flat Lefkoşa'));
    assert.ok(html.includes('Quiet hours after 23:00 on weekdays.'));
    assert.ok(html.includes('Kai Tanaka'));
    assert.ok(html.includes('Amina Mansour'));
    assert.ok(html.includes('Noise &amp; Guests'));
  });

  it('generates valid move-in condition snapshot HTML markup', () => {
    const html = generateConditionSnapshotHtml({
      household: mockHousehold,
      snapshots: mockSnapshots,
      members: mockMembers,
    });

    assert.ok(html.includes('Move-In Condition Snapshot'));
    assert.ok(html.includes('Living Room'));
    assert.ok(html.includes('Sofa and wooden table in clean state.'));
    assert.ok(html.includes('https://example.com/photo.jpg'));
    assert.ok(html.includes('Kai Tanaka, Amina Mansour'));
  });

  it('generates valid move-out certificate HTML with deposit calculation', () => {
    const mockInspection: MoveOutInspection = {
      id: 'out_1',
      householdId: 'h_test',
      userId: 'u1',
      moveInSnapshotId: 's1',
      roomName: 'Living Room',
      conditionNote: 'Leaving flat spotless, sofa in excellent shape.',
      photoUrls: ['https://example.com/out-photo.jpg'],
      isDamageReported: true,
      damageDeductionAmount: 50,
      depositPaidAmount: 300,
      depositRefundAmount: 250,
      confirmedByUserIds: ['u1', 'u2'],
      status: 'agreed',
      createdAt: '2026-11-15T10:00:00Z',
      updatedAt: '2026-11-15T10:00:00Z',
      version: 1,
    };

    const html = generateMoveOutCertificateHtml({
      household: mockHousehold,
      inspection: mockInspection,
      moveInSnapshot: mockSnapshots[0],
      departingTenant: mockMembers[0],
      confirmingMembers: mockMembers,
      allMembers: mockMembers,
    });

    assert.ok(html.includes('ROOMIE DEPOSIT PROTECTION & MOVE-OUT CERTIFICATE'));
    assert.ok(html.includes('Departing Tenant: Kai Tanaka'));
    assert.ok(html.includes('Initial Move-In Baseline'));
    assert.ok(html.includes('Final Move-Out State'));
    assert.ok(html.includes('₺300.00'));
    assert.ok(html.includes('-₺50.00'));
    assert.ok(html.includes('₺250.00'));
    assert.ok(html.includes('agreed'));
    assert.ok(html.includes('Kai Tanaka, Amina Mansour'));
  });
});
