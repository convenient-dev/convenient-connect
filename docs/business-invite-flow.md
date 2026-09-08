# Business Invite Code User Flow

## Overview

This document describes the user flow for business invite codes in ConvenientConnect. The system allows businesses to invite members to join and publish services under their business profile, with configurable subcategory permissions.

## Key Concepts

1. **Members need an invite code** to join a business
2. **Businesses generate unique invite codes** to share with members
3. **Two types of invite codes:**
   - **Temporary Restricted Code (24-hour expiry)**: Business pre-selects allowed subcategories before generating
   - **Permanent Universal Code**: Business's unique code that grants all subcategories by default; permissions can be modified after member joins
4. **Code sharing** enables automatic business affiliation during signup, or post-signup joining

---

## User Flow Diagrams

### 1. High-Level Flow: Member Joining Business

```mermaid
flowchart TD
    Start([Member wants to join business]) --> HasAccount{Has account?}
    
    HasAccount -->|No| SignUp[Sign up flow]
    HasAccount -->|Yes| EnterCode[Navigate to join business screen]
    
    SignUp --> DuringSignUp{Has invite code<br/>during signup?}
    
    DuringSignUp -->|Yes| EnterDuringSignUp[Enter code during signup]
    DuringSignUp -->|No| CompleteSignUp[Complete signup]
    
    EnterDuringSignUp --> ValidateCode1[Validate invite code]
    CompleteSignUp --> EnterCode
    
    EnterCode --> EnterCodeInput[Enter invite code]
    EnterCodeInput --> ValidateCode2[Validate invite code]
    
    ValidateCode1 --> CheckValid1{Code valid?}
    ValidateCode2 --> CheckValid2{Code valid?}
    
    CheckValid1 -->|Yes| JoinBusiness1[Join business automatically]
    CheckValid1 -->|No| ErrorSignUp[Show error message]
    
    CheckValid2 -->|Yes| JoinBusiness2[Join business]
    CheckValid2 -->|No| ErrorPostSignUp[Show error message]
    
    ErrorSignUp --> DuringSignUp
    ErrorPostSignUp --> EnterCodeInput
    
    JoinBusiness1 --> ApplyPermissions1[Apply subcategory permissions]
    JoinBusiness2 --> ApplyPermissions2[Apply subcategory permissions]
    
    ApplyPermissions1 --> Success1([Member affiliated with business])
    ApplyPermissions2 --> Success2([Member affiliated with business])
```

---

### 2. Business Owner Flow: Generating Invite Codes

```mermaid
flowchart TD
    Start([Business owner wants<br/>to invite members]) --> ChooseType{Choose<br/>invite type}
    
    ChooseType -->|Temporary<br/>Restricted| SelectSubcat[Select allowed subcategories]
    ChooseType -->|Permanent<br/>Universal| UsePermanent[Use business unique code]
    
    SelectSubcat --> GenerateTemp[Generate temporary code]
    GenerateTemp --> Display1[Display code with<br/>24-hour expiry notice]
    
    UsePermanent --> Display2[Display permanent<br/>business code]
    
    Display1 --> Share1[Share code with members]
    Display2 --> Share2[Share code with members]
    
    Share1 --> Wait1[Wait for members to join]
    Share2 --> Wait2[Wait for members to join]
    
    Wait1 --> MemberJoins1[Member joins with<br/>restricted permissions]
    Wait2 --> MemberJoins2[Member joins with<br/>all permissions]
    
    MemberJoins1 --> End1([Code expires after 24hrs<br/>or remains active])
    MemberJoins2 --> CanModify[Can modify member<br/>permissions later]
    
    CanModify --> ModifyPerms{Modify<br/>permissions?}
    ModifyPerms -->|Yes| UpdateSubcat[Update allowed subcategories]
    ModifyPerms -->|No| End2([Member active])
    
    UpdateSubcat --> End2
```

---

### 3. Detailed Flow: Code Validation and Permission Assignment

```mermaid
flowchart TD
    Start([Member submits<br/>invite code]) --> Validate[Validate code format]
    
    Validate --> CheckDB{Code exists<br/>in database?}
    
    CheckDB -->|No| Error1[Error: Invalid code]
    CheckDB -->|Yes| CheckType{Code type?}
    
    CheckType -->|Temporary| CheckExpiry{Expired?<br/>24hrs check}
    CheckType -->|Permanent| CheckBusiness2[Verify business active]
    
    CheckExpiry -->|Yes| Error2[Error: Code expired]
    CheckExpiry -->|No| CheckBusiness1[Verify business active]
    
    CheckBusiness1 --> BusinessActive1{Business<br/>active?}
    CheckBusiness2 --> BusinessActive2{Business<br/>active?}
    
    BusinessActive1 -->|No| Error3[Error: Business inactive]
    BusinessActive2 -->|No| Error4[Error: Business inactive]
    
    BusinessActive1 -->|Yes| CheckMember1{Already<br/>a member?}
    BusinessActive2 -->|Yes| CheckMember2{Already<br/>a member?}
    
    CheckMember1 -->|Yes| Error5[Error: Already a member]
    CheckMember2 -->|Yes| Error6[Error: Already a member]
    
    CheckMember1 -->|No| GetTempPerms[Get pre-selected<br/>subcategories from code]
    CheckMember2 -->|No| GetAllPerms[Assign all<br/>subcategories by default]
    
    GetTempPerms --> CreateMembership1[Create business membership<br/>with restricted permissions]
    GetAllPerms --> CreateMembership2[Create business membership<br/>with all permissions]
    
    CreateMembership1 --> Success1([Success: Member joined<br/>with restricted access])
    CreateMembership2 --> Success2([Success: Member joined<br/>with full access])
    
    Error1 --> End([End])
    Error2 --> End
    Error3 --> End
    Error4 --> End
    Error5 --> End
    Error6 --> End
```

---

### 4. State Diagram: Member Permission Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NotAffiliated: User signs up
    
    NotAffiliated --> PendingJoin: Enters invite code
    
    PendingJoin --> RestrictedMember: Temp code validated<br/>(pre-selected subcategories)
    PendingJoin --> FullMember: Permanent code validated<br/>(all subcategories)
    PendingJoin --> NotAffiliated: Invalid/expired code
    
    RestrictedMember --> RestrictedMember: Code expires after 24hrs<br/>(permissions retained)
    FullMember --> ModifiedMember: Owner modifies permissions
    
    ModifiedMember --> ModifiedMember: Owner updates permissions
    ModifiedMember --> FullMember: Owner restores all permissions
    
    RestrictedMember --> Removed: Owner removes member
    FullMember --> Removed: Owner removes member
    ModifiedMember --> Removed: Owner removes member
    
    Removed --> [*]
```

---

## Code Types Comparison

| Feature | Temporary Restricted Code | Permanent Universal Code |
|---------|---------------------------|--------------------------|
| **Expiry** | 24 hours | Never expires |
| **Subcategories** | Pre-selected by business before generation | All subcategories by default |
| **Modifiable after join** | No (code expires, permissions stay) | Yes (owner can modify anytime) |
| **Use case** | Specific role/department with limited scope | General invitation, full flexibility |
| **Generation** | On-demand per invitation | One unique code per business |

---

## Implementation Notes

### API Endpoints (Expected)

- `POST /api/v1/business/invite-code/generate` - Generate temporary restricted code
- `GET /api/v1/business/invite-code` - Get permanent business code
- `POST /api/v1/business/join` - Join business with code
- `PATCH /api/v1/business/members/:memberId/permissions` - Update member permissions

### Database Schema Considerations

**Invite Codes Table:**
- `id` (PK)
- `business_id` (FK)
- `code` (unique, indexed)
- `type` (enum: 'temporary' | 'permanent')
- `allowed_subcategories` (JSON array, null for permanent codes)
- `expires_at` (timestamp, null for permanent codes)
- `created_at` (timestamp)

**Business Members Table:**
- `id` (PK)
- `business_id` (FK)
- `user_id` (FK)
- `allowed_subcategories` (JSON array)
- `joined_via_code` (FK to invite_codes)
- `joined_at` (timestamp)

### Mobile App Screens

1. **Business Invite Code Generation** (`apps/mobile/app/(account)/business-management/generate-invite-code.tsx`)
   - Radio buttons: Temporary Restricted / Permanent Universal
   - If temporary: subcategory selection UI (reuse from `select-subcategories.tsx`)
   - Display generated code with QR code option
   - Share button (native share API)

2. **Member Join Business** (`apps/mobile/app/(account)/join-business.tsx`)
   - Code input field
   - Validation feedback
   - Success/error messaging

3. **During Signup** (enhance `apps/mobile/app/(onboarding)/*`)
   - Optional invite code field
   - Auto-affiliate on successful signup

4. **Business Member Management** (`apps/mobile/app/(account)/business-management/members.tsx`)
   - List members with permission badges
   - Tap member → modify permissions screen

---

## User Experience Considerations

- **QR Code sharing**: Generate QR codes for invite codes to simplify in-person sharing
- **Deep linking**: Support `convenientconnect://join?code=ABC123` URLs
- **Expiry notifications**: Notify business owner when temporary codes are about to expire
- **Permission clarity**: Show members which subcategories they can publish under
- **Audit trail**: Log who joined with which code for business owner transparency


```mermaid
flowchart TD
    A[Business owner generates invite code] --> B{Choose code type}

    B -->|Type A: category-limited| C[Select allowed subcategories]
    C --> D[Generate code<br/>Valid for 24 hours]

    B -->|Type B: universal code| E[Generate permanent unique code<br/>All subcategories enabled by default]

    D --> F[Business owner shares code with members]
    E --> F

    F --> G{Is member already signed up?}
    G -->|No, new user| H[Sign up using invite code]
    H --> I[Auto-affiliated with business]

    G -->|Yes, existing user| J[Redirected to enter-code screen]
    J --> K[Member enters invite code]
    K --> L[Joins business]

    I --> M{Which code type was used?}
    L --> M

    M -->|Type A code| N[Member can publish services<br/>only under allowed subcategories]
    M -->|Type B code| O[Member can publish services<br/>under all subcategories]

    N --> P[Business owner can later<br/>adjust member's allowed subcategories]
    O --> P
    ```