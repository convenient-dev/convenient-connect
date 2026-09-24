# API Migration Guide: Legacy to Laravel

This document provides a comprehensive guide for migrating from the legacy Next.js API (`apps/web`) to the Laravel API.

## Migration Status

### ✅ Completed Migrations

| Legacy Function | Laravel Replacement | Files Updated | Status |
|----------------|-------------------|---------------|---------|
| `getCategories()` | `getServiceCategories()` | 2 files | ✅ Complete |
| `getSubcategories()` | `getServiceCategories()` | 2 files | ✅ Complete |

### 🟢 Available - Ready to Migrate

#### Availability Management

**API File Created:** `apps/mobile/api/availability.ts`

| Legacy Function | Laravel Function | Notes |
|----------------|-----------------|-------|
| `getAvailability(userId)` | `getAvailability()` | No userId needed (uses auth token) |
| `toggleAvailability(userId, body)` | `toggleAvailabilityStatus()` | No body needed |
| `setWeeklySlots(userId, body)` | `saveAvailability(params)` | Unified save endpoint |
| `setOverrides(userId, body)` | `saveDateAvailability(params)` | Date-specific overrides |

**Data Structure Changes:**

**Legacy API Response:**
```typescript
{
  availabilityEnabled: boolean;
  weeklyAvailabilitySlots: Array<{
    id: number;
    dayOfWeek: number;  // 0-6
    startTime: string;  // "HH:mm"
    endTime: string;    // "HH:mm"
  }>;
  availabilityOverrideDays: Array<{
    id: number;
    date: string;
    isAvailable: boolean;
    slots: Array<{
      id: number;
      startTime: string;
      endTime: string;
    }>;
  }>;
}
```

**Laravel API Response:**
```typescript
{
  timezone: {
    id: number;
    name: string;  // e.g., "America/New_York"
  };
  is_available: boolean;
  apply_to_all: boolean;
  slots: Array<{  // Only when apply_to_all=true
    start_time: string;  // "HH:MM"
    end_time: string;    // "HH:MM"
  }>;
  days: Array<{
    day_id: number;
    day_name: string;
    slots: Array<{
      start_time: string;
      end_time: string;
    }>;
  }>;
}
```

**Files Requiring Updates:**
- `/app/(earnings)/schedule.tsx` - Complex UI, requires significant refactoring
- `/app/(tabs)/calendar.tsx` - Needs data structure mapping

**Migration Complexity:** 🔴 HIGH
- Major data structure differences
- UI logic tightly coupled to legacy format
- Requires comprehensive refactoring

---

#### Profile Management

**Laravel Function:** `getAuthUser()` (already exists in `api/profile.ts`)

| Legacy Function | Laravel Function | Notes |
|----------------|-----------------|-------|
| `getLegacyUser(userId)` | `getAuthUser()` | Returns authenticated user profile |
| `getUserCategories(userId)` | `getServiceCategories()` | Use business services endpoint |

**Files Requiring Updates:**
- `/app/(services)/create-service-form.tsx` - Replace `getLegacyUser()`
- `/app/(services)/edit-service/[id]/information.tsx` - Replace `getLegacyUser()`
- `/app/(tabs)/profile.tsx` - Replace `getUserCategories()`

**Migration Complexity:** 🟡 MEDIUM
- Straightforward function replacement
- May need response data mapping

---

### 🔴 Blocked - Laravel API Does Not Exist

#### Services Management (9 files affected)

**Missing Endpoints:**
- `GET /service-provider/services` - List user services
- `GET /service-provider/services/{id}` - Get single service
- `POST /service-provider/services` - Create service
- `PUT /service-provider/services/{id}` - Update service
- `DELETE /service-provider/services/{id}` - Delete service
- `GET /subcategories/{id}` - Get subcategory details

**Required Backend Work:**
1. Create service CRUD endpoints
2. Define service model schema
3. Implement pricing, availability, and media associations

**Files Blocked:**
- `/app/(services)/create-service.tsx`
- `/app/(services)/create-service-form.tsx`
- `/app/(services)/edit-service/[id]/index.tsx`
- `/app/(services)/edit-service/[id]/category.tsx`
- `/app/(services)/edit-service/[id]/pricing.tsx`
- `/app/(services)/edit-service/[id]/information.tsx`
- `/app/(services)/service-detail/[id].tsx`
- `/app/(tabs)/services.tsx`
- `/app/(tabs)/home.tsx`

---

#### Business Affiliations (2 files affected)

**Missing Endpoint:**
- `GET /service-provider/business/affiliations` - Get business affiliations

**Note:** Laravel has `/business/list` and `/business/edit/{id}` but no affiliations-specific endpoint.

**Files Blocked:**
- `/app/(services)/create-service.tsx`
- `/app/(account)/business-management/index.tsx`

---

#### Support/Tickets System (4 files affected)

**Missing Endpoints:**
- `GET /service-provider/support/tickets` - List tickets
- `GET /service-provider/support/tickets/{id}` - Get ticket
- `POST /service-provider/support/tickets` - Create ticket
- `GET /service-provider/support/faq` - Get FAQ

**Required Backend Work:**
1. Create support ticket system
2. Implement FAQ management
3. Add ticket status tracking

**Files Blocked:**
- `/app/(support)/my-tickets.tsx`
- `/app/(support)/ticket-detail/[id].tsx`
- `/app/(support)/submit-ticket.tsx`
- `/app/(support)/customer-support.tsx`

---

#### File Uploads (2 files affected)

**Missing Endpoints:**
- `POST /uploads/images` - Upload service images
- `DELETE /uploads/images/{id}` - Delete image
- `POST /uploads/pdfs` - Upload service documents
- `DELETE /uploads/pdfs/{id}` - Delete document

**Note:** Business profile creation has document upload fields, but no general-purpose service media endpoints exist.

**Required Backend Work:**
1. Create media upload endpoints
2. Implement image processing/optimization
3. Add S3/storage integration
4. Define media associations with services

**Files Blocked:**
- `/app/(services)/create-service-form.tsx`
- `/app/(services)/edit-service/[id]/information.tsx`

---

## Migration Priority Recommendations

### Phase 1: ✅ Completed
- [x] Categories/Subcategories (2 files)

### Phase 2: 🟢 Can Migrate Now (if time permits)
- [ ] Profile endpoints (3 files) - Medium complexity
- [ ] Availability endpoints (2 files) - High complexity

### Phase 3: 🔴 Requires Backend Development
1. **Services CRUD** (9 files) - Highest priority
2. **File Uploads** (2 files) - Blocks service creation/editing
3. **Support System** (4 files) - Lower priority
4. **Business Affiliations** (2 files) - Lower priority

---

## Implementation Notes

### For Availability Migration

The schedule.tsx file is particularly complex because:
1. It manages both weekly and override availability
2. Uses a custom time slot system (30-min increments)
3. Has complex UI state management
4. Tightly coupled to legacy data format

**Recommended Approach:**
1. Create adapter functions to transform Laravel response to legacy format
2. Gradually refactor UI to work with new format
3. Test thoroughly with real availability data

### For Services Migration

Services are the core feature and require backend API first:
1. Define service schema (pricing, availability, categories, media)
2. Implement CRUD endpoints
3. Add validation and authorization
4. Then migrate mobile app to use new endpoints

---

## Testing Strategy

For each migration:
1. Create adapter/mapper functions
2. Write unit tests for data transformation
3. Test in isolation with mock data
4. Verify with real API calls
5. Test all affected user flows
6. Monitor for errors in production

---

## Rollback Plan

If issues arise:
1. Legacy API (`apps/web`) remains operational
2. Can revert individual file imports
3. Both APIs can coexist during migration
4. Remove legacy API only when all migrations complete

---

## Progress Tracking

**Total Functions:** 27  
**Migrated:** 2 (7%)  
**Can Migrate:** 7 (26%)  
**Blocked:** 18 (67%)

**Files Updated:** 6  
**Files Remaining:** 17

---

## Business Management Implementation (August 4, 2026)

### ✅ Completed Implementation

**Files Updated:**
- `apps/mobile/app/(account)/business-management/[id].tsx`
- `apps/mobile/app/(account)/business-management/view-business-detail.tsx`
- `apps/mobile/app/(account)/business-management/edit-business.tsx` (NEW)

**Features Implemented:**
- ✅ Load business details using `getBusinessForEdit(businessId)`
- ✅ Toggle business status (active/inactive) using `toggleBusinessStatus(businessId)`
- ✅ Delete business with confirmation dialog using `deleteBusiness(businessId)`
- ✅ Edit business details using `updateBusinessProfile(businessId, params)`
- ✅ Display business information, service categories, verification status
- ✅ Pre-fill form fields with existing data in edit mode
- ✅ Proper error handling and loading states
- ✅ Form validation matching Figma designs

**Data Structure:**
```typescript
interface Business {
  id: number;
  business_name: string;
  business_address: string;
  about: string | null;
  country_id: number;
  state_id: number;
  city_id: number;
  zipcode: string | null;
  business_ein: string | null;
  status: string; // "active", "inactive", "pending", "verified"
  service_sub_categories: Array<{
    sub_category_id: number;
    sub_category_name: string;
    category_name: string;
  }>;
  country?: { name: string };
  state?: { name: string };
  city?: { name: string };
  stripe_account_last_four?: string;
}
```

### ⚠️ TODO: Business Management

**Business List Integration:**
- Update `apps/mobile/app/(account)/business-management/index.tsx`
- Replace `BusinessSignupContext` with `listBusinesses()` API call
- Display real businesses from the API

**Team Management (Endpoints Available, UI Not Implemented):**
- `listBusinessMembers()` - List all members
- `inviteBusinessMember(params)` - Invite new member
- `getBusinessMember(memberId)` - Get member details
- `getMemberServices(memberId)` - Get member's services
- `updateMemberServices(memberId, serviceId, params)` - Assign services

---

## Next Steps

1. **Immediate:** Decide on Phase 2 migration (availability + profile)
2. **Short-term:** Backend team implements services CRUD API
3. **Medium-term:** Migrate services management (9 files)
4. **Long-term:** Implement support system and remaining features
