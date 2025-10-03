from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Depends, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========= MODELS =========

class User(BaseModel):
    id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: EmailStr
    name: str
    picture: Optional[str] = None
    wallet_balance: float = Field(default=0.0)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WalletTopup(BaseModel):
    amount: float

class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    user_id: str
    amount: float
    bonus: float = 0.0
    final_amount: float
    transaction_type: str  # 'topup' or 'booking'
    booking_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    duration_minutes: int  # 30, 60, 120, 180
    ps5_setup: int  # 1 or 2
    controllers: int  # 1-4
    payment_method: str  # 'wallet' or 'mock'

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: f"booking_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_name: str
    user_email: str
    date: str
    start_time: str
    end_time: str
    duration_minutes: int
    ps5_setup: int
    controllers: int
    base_price: float
    controller_charges: float
    total_price: float
    payment_method: str
    payment_status: str = "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========= AUTH HELPERS =========

async def get_current_user(
    authorization: Optional[str] = None,
    session_token: Optional[str] = Cookie(None)
) -> User:
    """Get current user from session token (cookie or header)"""
    token = session_token
    
    # Fallback to Authorization header if no cookie
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Find session in database
    session = await db.user_sessions.find_one({"session_token": token})
    if not session or session["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    # Get user
    user = await db.users.find_one({"id": session["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return User(**user)

async def get_current_user_from_header(authorization: str = None):
    """Dependency to extract user from Authorization header"""
    return await get_current_user(authorization=authorization)

# ========= AUTH ROUTES =========

@api_router.post("/auth/session")
async def create_session(session_id: str, response: Response):
    """Process session_id from Emergent Auth and create session"""
    try:
        # Call Emergent Auth API to get user data
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid session ID"
                )
            
            user_data = auth_response.json()
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": user_data["email"]})
        
        if existing_user:
            user = User(**existing_user)
        else:
            # Create new user
            user = User(
                email=user_data["email"],
                name=user_data["name"],
                picture=user_data.get("picture")
            )
            await db.users.insert_one(user.dict())
        
        # Create session
        session_token = user_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session = UserSession(
            user_id=user.id,
            session_token=session_token,
            expires_at=expires_at
        )
        
        await db.user_sessions.insert_one(session.dict())
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        return {"user": user.dict(), "session_token": session_token}
        
    except httpx.RequestError as e:
        logger.error(f"Auth service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ========= WALLET ROUTES =========

@api_router.post("/wallet/topup")
async def topup_wallet(
    topup: WalletTopup,
    user: User = Depends(get_current_user)
):
    """Top up wallet with bonus calculation"""
    amount = topup.amount
    
    # Calculate bonus
    if amount >= 1000:
        bonus_percentage = 10
    elif amount >= 500:
        bonus_percentage = 5
    else:
        bonus_percentage = 0
    
    bonus = (amount * bonus_percentage) / 100
    final_amount = amount + bonus
    
    # Update user wallet
    await db.users.update_one(
        {"id": user.id},
        {"$inc": {"wallet_balance": final_amount}}
    )
    
    # Record transaction
    transaction = WalletTransaction(
        user_id=user.id,
        amount=amount,
        bonus=bonus,
        final_amount=final_amount,
        transaction_type="topup"
    )
    await db.wallet_transactions.insert_one(transaction.dict())
    
    # Get updated balance
    updated_user = await db.users.find_one({"id": user.id})
    
    return {
        "amount_paid": amount,
        "bonus": bonus,
        "bonus_percentage": bonus_percentage,
        "credited_amount": final_amount,
        "new_balance": updated_user["wallet_balance"]
    }

@api_router.get("/wallet/balance")
async def get_wallet_balance(user: User = Depends(get_current_user)):
    """Get wallet balance"""
    updated_user = await db.users.find_one({"id": user.id})
    return {"balance": updated_user["wallet_balance"]}

@api_router.get("/wallet/transactions")
async def get_wallet_transactions(user: User = Depends(get_current_user)):
    """Get wallet transaction history"""
    transactions = await db.wallet_transactions.find(
        {"user_id": user.id}
    ).sort("timestamp", -1).to_list(100)
    
    return [WalletTransaction(**txn) for txn in transactions]

# ========= BOOKING ROUTES =========

def calculate_price(duration_minutes: int, controllers: int):
    """Calculate booking price"""
    base_rate_per_hour = 149
    extra_controller_rate = 40
    
    # Calculate base price
    hours = duration_minutes / 60
    base_price = base_rate_per_hour * hours
    
    # Calculate controller charges (extra controllers only)
    extra_controllers = max(0, controllers - 1)
    controller_charges = extra_controller_rate * extra_controllers * hours
    
    total_price = base_price + controller_charges
    
    return {
        "base_price": round(base_price, 2),
        "controller_charges": round(controller_charges, 2),
        "total_price": round(total_price, 2)
    }

def calculate_end_time(start_time: str, duration_minutes: int):
    """Calculate end time from start time and duration"""
    start_hour, start_minute = map(int, start_time.split(':'))
    start_dt = datetime(2000, 1, 1, start_hour, start_minute)
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    return end_dt.strftime('%H:%M')

@api_router.post("/bookings")
async def create_booking(
    booking_data: BookingCreate,
    user: User = Depends(get_current_user)
):
    """Create a new booking"""
    
    # Validate inputs
    if booking_data.ps5_setup not in [1, 2]:
        raise HTTPException(status_code=400, detail="Invalid PS5 setup. Must be 1 or 2")
    
    if booking_data.controllers < 1 or booking_data.controllers > 4:
        raise HTTPException(status_code=400, detail="Controllers must be between 1 and 4")
    
    if booking_data.duration_minutes not in [30, 60, 120, 180]:
        raise HTTPException(status_code=400, detail="Invalid duration")
    
    # Check for conflicting bookings
    end_time = calculate_end_time(booking_data.start_time, booking_data.duration_minutes)
    
    existing_bookings = await db.bookings.find({
        "date": booking_data.date,
        "ps5_setup": booking_data.ps5_setup
    }).to_list(100)
    
    # Check time overlap
    for existing in existing_bookings:
        if not (booking_data.start_time >= existing["end_time"] or end_time <= existing["start_time"]):
            raise HTTPException(
                status_code=400,
                detail=f"Time slot already booked for PS5 Setup {booking_data.ps5_setup}"
            )
    
    # Calculate price
    pricing = calculate_price(booking_data.duration_minutes, booking_data.controllers)
    total_price = pricing["total_price"]
    
    # Handle payment
    if booking_data.payment_method == "wallet":
        updated_user = await db.users.find_one({"id": user.id})
        if updated_user["wallet_balance"] < total_price:
            raise HTTPException(
                status_code=400,
                detail="Insufficient wallet balance"
            )
        
        # Deduct from wallet
        await db.users.update_one(
            {"id": user.id},
            {"$inc": {"wallet_balance": -total_price}}
        )
    
    # Create booking
    booking = Booking(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        date=booking_data.date,
        start_time=booking_data.start_time,
        end_time=end_time,
        duration_minutes=booking_data.duration_minutes,
        ps5_setup=booking_data.ps5_setup,
        controllers=booking_data.controllers,
        base_price=pricing["base_price"],
        controller_charges=pricing["controller_charges"],
        total_price=total_price,
        payment_method=booking_data.payment_method,
        payment_status="completed"
    )
    
    await db.bookings.insert_one(booking.dict())
    
    # Record wallet transaction if paid via wallet
    if booking_data.payment_method == "wallet":
        transaction = WalletTransaction(
            user_id=user.id,
            amount=-total_price,
            bonus=0.0,
            final_amount=-total_price,
            transaction_type="booking",
            booking_id=booking.id
        )
        await db.wallet_transactions.insert_one(transaction.dict())
    
    return booking

@api_router.get("/bookings/my-bookings")
async def get_my_bookings(user: User = Depends(get_current_user)):
    """Get current user's bookings"""
    bookings = await db.bookings.find(
        {"user_id": user.id}
    ).sort("created_at", -1).to_list(100)
    
    return [Booking(**booking) for booking in bookings]

@api_router.get("/bookings/availability")
async def check_availability(date: str, ps5_setup: int):
    """Check availability for a specific date and setup"""
    if ps5_setup not in [1, 2]:
        raise HTTPException(status_code=400, detail="Invalid PS5 setup")
    
    bookings = await db.bookings.find({
        "date": date,
        "ps5_setup": ps5_setup
    }).to_list(100)
    
    occupied_slots = [
        {
            "start_time": booking["start_time"],
            "end_time": booking["end_time"]
        }
        for booking in bookings
    ]
    
    return {
        "date": date,
        "ps5_setup": ps5_setup,
        "occupied_slots": occupied_slots
    }

@api_router.get("/bookings/calculate-price")
async def calculate_booking_price(duration_minutes: int, controllers: int):
    """Calculate price for a booking"""
    if duration_minutes not in [30, 60, 120, 180]:
        raise HTTPException(status_code=400, detail="Invalid duration")
    
    if controllers < 1 or controllers > 4:
        raise HTTPException(status_code=400, detail="Controllers must be between 1 and 4")
    
    return calculate_price(duration_minutes, controllers)

# ========= ADMIN ROUTES =========

@api_router.get("/admin/bookings")
async def get_all_bookings(
    date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get all bookings (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if date:
        query["date"] = date
    
    bookings = await db.bookings.find(query).sort("date", -1).to_list(1000)
    
    return [Booking(**booking) for booking in bookings]

@api_router.get("/admin/stats")
async def get_admin_stats(user: User = Depends(get_current_user)):
    """Get admin dashboard stats"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_bookings = await db.bookings.count_documents({})
    total_users = await db.users.count_documents({})
    
    # Calculate today's bookings
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_bookings = await db.bookings.count_documents({"date": today})
    
    # Calculate total revenue
    bookings = await db.bookings.find().to_list(10000)
    total_revenue = sum(booking["total_price"] for booking in bookings)
    
    return {
        "total_bookings": total_bookings,
        "total_users": total_users,
        "today_bookings": today_bookings,
        "total_revenue": round(total_revenue, 2)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()