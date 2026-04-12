"""
Database seeding script for IPL Fantasy League
Run this once to initialize the database with all players, matches, and default admin
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()

# All IPL 2026 players
INITIAL_PLAYERS = [
    # ── RCB ──
    {"id": "p_rcb_1", "name": "Virat Kohli", "franchise": "RCB", "role": "Batsman"},
    {"id": "p_rcb_2", "name": "Rajat Patidar", "franchise": "RCB", "role": "Batsman"},
    {"id": "p_rcb_3", "name": "Devdutt Padikkal", "franchise": "RCB", "role": "Batsman"},
    {"id": "p_rcb_4", "name": "Phil Salt", "franchise": "RCB", "role": "Wicket-keeper"},
    {"id": "p_rcb_5", "name": "Jitesh Sharma", "franchise": "RCB", "role": "Wicket-keeper"},
    {"id": "p_rcb_6", "name": "Venkatesh Iyer", "franchise": "RCB", "role": "All-rounder"},
    {"id": "p_rcb_7", "name": "Tim David", "franchise": "RCB", "role": "All-rounder"},
    {"id": "p_rcb_8", "name": "Romario Shepherd", "franchise": "RCB", "role": "All-rounder"},
    {"id": "p_rcb_9", "name": "Krunal Pandya", "franchise": "RCB", "role": "All-rounder"},
    {"id": "p_rcb_10", "name": "Jacob Bethell", "franchise": "RCB", "role": "All-rounder"},
    {"id": "p_rcb_11", "name": "Swapnil Singh", "franchise": "RCB", "role": "All-rounder"},
    {"id": "p_rcb_12", "name": "Josh Hazlewood", "franchise": "RCB", "role": "Bowler"},
    {"id": "p_rcb_13", "name": "Bhuvneshwar Kumar", "franchise": "RCB", "role": "Bowler"},
    {"id": "p_rcb_14", "name": "Yash Dayal", "franchise": "RCB", "role": "Bowler"},
    {"id": "p_rcb_15", "name": "Jacob Duffy", "franchise": "RCB", "role": "Bowler"},
    {"id": "p_rcb_16", "name": "Suyash Sharma", "franchise": "RCB", "role": "Bowler"},
    {"id": "p_rcb_17", "name": "Rasikh Salam", "franchise": "RCB", "role": "Bowler"},
    {"id": "p_rcb_18", "name": "Mangesh Yadav", "franchise": "RCB", "role": "Bowler"},
    
    # ── SRH ──
    {"id": "p_srh_1", "name": "Pat Cummins", "franchise": "SRH", "role": "All-rounder"},
    {"id": "p_srh_2", "name": "Travis Head", "franchise": "SRH", "role": "Batsman"},
    {"id": "p_srh_3", "name": "Abhishek Sharma", "franchise": "SRH", "role": "All-rounder"},
    {"id": "p_srh_4", "name": "Ishan Kishan", "franchise": "SRH", "role": "Wicket-keeper"},
    {"id": "p_srh_5", "name": "Heinrich Klaasen", "franchise": "SRH", "role": "Wicket-keeper"},
    {"id": "p_srh_6", "name": "Nitish Kumar Reddy", "franchise": "SRH", "role": "All-rounder"},
    {"id": "p_srh_7", "name": "Liam Livingstone", "franchise": "SRH", "role": "All-rounder"},
    {"id": "p_srh_8", "name": "Jaydev Unadkat", "franchise": "SRH", "role": "Bowler"},
    {"id": "p_srh_9", "name": "Harshal Patel", "franchise": "SRH", "role": "Bowler"},
    {"id": "p_srh_10", "name": "Adam Zampa", "franchise": "SRH", "role": "Bowler"},
    {"id": "p_srh_11", "name": "Simarjeet Singh", "franchise": "SRH", "role": "Bowler"},
    {"id": "p_srh_12", "name": "Atharva Taide", "franchise": "SRH", "role": "Batsman"},
    
    # ── MI ──
    {"id": "p_mi_1", "name": "Rohit Sharma", "franchise": "MI", "role": "Batsman"},
    {"id": "p_mi_2", "name": "Suryakumar Yadav", "franchise": "MI", "role": "Batsman"},
    {"id": "p_mi_3", "name": "Tilak Varma", "franchise": "MI", "role": "Batsman"},
    {"id": "p_mi_4", "name": "Ryan Rickelton", "franchise": "MI", "role": "Wicket-keeper"},
    {"id": "p_mi_5", "name": "Robin Minz", "franchise": "MI", "role": "Wicket-keeper"},
    {"id": "p_mi_6", "name": "Hardik Pandya", "franchise": "MI", "role": "All-rounder"},
    {"id": "p_mi_7", "name": "Naman Dhir", "franchise": "MI", "role": "All-rounder"},
    {"id": "p_mi_8", "name": "Will Jacks", "franchise": "MI", "role": "All-rounder"},
    {"id": "p_mi_9", "name": "Jasprit Bumrah", "franchise": "MI", "role": "Bowler"},
    {"id": "p_mi_10", "name": "Trent Boult", "franchise": "MI", "role": "Bowler"},
    {"id": "p_mi_11", "name": "Deepak Chahar", "franchise": "MI", "role": "Bowler"},
    {"id": "p_mi_12", "name": "Vignesh Puthur", "franchise": "MI", "role": "Bowler"},
    {"id": "p_mi_13", "name": "Arjun Tendulkar", "franchise": "MI", "role": "Bowler"},
    
    # ── KKR ──
    {"id": "p_kkr_1", "name": "Ajinkya Rahane", "franchise": "KKR", "role": "Batsman"},
    {"id": "p_kkr_2", "name": "Angkrish Raghuvanshi", "franchise": "KKR", "role": "Batsman"},
    {"id": "p_kkr_3", "name": "Rinku Singh", "franchise": "KKR", "role": "Batsman"},
    {"id": "p_kkr_4", "name": "Quinton de Kock", "franchise": "KKR", "role": "Wicket-keeper"},
    {"id": "p_kkr_5", "name": "Sunil Narine", "franchise": "KKR", "role": "All-rounder"},
    {"id": "p_kkr_6", "name": "Andre Russell", "franchise": "KKR", "role": "All-rounder"},
    {"id": "p_kkr_7", "name": "Cameron Green", "franchise": "KKR", "role": "All-rounder"},
    {"id": "p_kkr_8", "name": "Varun Chakravarthy", "franchise": "KKR", "role": "Bowler"},
    {"id": "p_kkr_9", "name": "Harshit Rana", "franchise": "KKR", "role": "Bowler"},
    {"id": "p_kkr_10", "name": "Matheesha Pathirana", "franchise": "KKR", "role": "Bowler"},
    {"id": "p_kkr_11", "name": "Spencer Johnson", "franchise": "KKR", "role": "Bowler"},
    {"id": "p_kkr_12", "name": "Blessing Muzarabani", "franchise": "KKR", "role": "Bowler"},
    {"id": "p_kkr_13", "name": "Anrich Nortje", "franchise": "KKR", "role": "Bowler"},
    
    # ── CSK ──
    {"id": "p_csk_1", "name": "Ruturaj Gaikwad", "franchise": "CSK", "role": "Batsman"},
    {"id": "p_csk_2", "name": "Ayush Mhatre", "franchise": "CSK", "role": "Batsman"},
    {"id": "p_csk_3", "name": "Dewald Brevis", "franchise": "CSK", "role": "Batsman"},
    {"id": "p_csk_4", "name": "Sarfaraz Khan", "franchise": "CSK", "role": "Batsman"},
    {"id": "p_csk_5", "name": "MS Dhoni", "franchise": "CSK", "role": "Wicket-keeper"},
    {"id": "p_csk_6", "name": "Sanju Samson", "franchise": "CSK", "role": "Wicket-keeper"},
    {"id": "p_csk_7", "name": "Urvil Patel", "franchise": "CSK", "role": "Wicket-keeper"},
    {"id": "p_csk_8", "name": "Shivam Dube", "franchise": "CSK", "role": "All-rounder"},
    {"id": "p_csk_9", "name": "Kartik Sharma", "franchise": "CSK", "role": "All-rounder"},
    {"id": "p_csk_10", "name": "Akeal Hosein", "franchise": "CSK", "role": "All-rounder"},
    {"id": "p_csk_11", "name": "Jamie Overton", "franchise": "CSK", "role": "All-rounder"},
    {"id": "p_csk_12", "name": "Nathan Ellis", "franchise": "CSK", "role": "Bowler"},
    {"id": "p_csk_13", "name": "Prashant Veer", "franchise": "CSK", "role": "Bowler"},
    {"id": "p_csk_14", "name": "Matt Henry", "franchise": "CSK", "role": "Bowler"},
    {"id": "p_csk_15", "name": "Noor Ahmad", "franchise": "CSK", "role": "Bowler"},
    {"id": "p_csk_16", "name": "Khaleel Ahmed", "franchise": "CSK", "role": "Bowler"},
    {"id": "p_csk_17", "name": "Mukesh Choudhary", "franchise": "CSK", "role": "Bowler"},
    {"id": "p_csk_18", "name": "Anshul Kamboj", "franchise": "CSK", "role": "Bowler"},
    {"id": "p_csk_19", "name": "Gurjapneet Singh", "franchise": "CSK", "role": "Bowler"},
    
    # ── RR ──
    {"id": "p_rr_1", "name": "Yashasvi Jaiswal", "franchise": "RR", "role": "Batsman"},
    {"id": "p_rr_2", "name": "Shimron Hetmyer", "franchise": "RR", "role": "Batsman"},
    {"id": "p_rr_3", "name": "Dhruv Jurel", "franchise": "RR", "role": "Wicket-keeper"},
    {"id": "p_rr_4", "name": "Riyan Parag", "franchise": "RR", "role": "All-rounder"},
    {"id": "p_rr_5", "name": "Ravindra Jadeja", "franchise": "RR", "role": "All-rounder"},
    {"id": "p_rr_6", "name": "Sam Curran", "franchise": "RR", "role": "All-rounder"},
    {"id": "p_rr_7", "name": "Wanindu Hasaranga", "franchise": "RR", "role": "All-rounder"},
    {"id": "p_rr_8", "name": "Sandeep Sharma", "franchise": "RR", "role": "Bowler"},
    {"id": "p_rr_9", "name": "Maheesh Theekshana", "franchise": "RR", "role": "Bowler"},
    {"id": "p_rr_10", "name": "Kumar Kartikeya", "franchise": "RR", "role": "Bowler"},
    {"id": "p_rr_11", "name": "Akash Madhwal", "franchise": "RR", "role": "Bowler"},
    
    # ── GT ──
    {"id": "p_gt_1", "name": "Shubman Gill", "franchise": "GT", "role": "Batsman"},
    {"id": "p_gt_2", "name": "David Miller", "franchise": "GT", "role": "Batsman"},
    {"id": "p_gt_3", "name": "Sai Sudharsan", "franchise": "GT", "role": "Batsman"},
    {"id": "p_gt_4", "name": "Shahrukh Khan", "franchise": "GT", "role": "Batsman"},
    {"id": "p_gt_5", "name": "Jos Buttler", "franchise": "GT", "role": "Wicket-keeper"},
    {"id": "p_gt_6", "name": "Wriddhiman Saha", "franchise": "GT", "role": "Wicket-keeper"},
    {"id": "p_gt_7", "name": "Matthew Wade", "franchise": "GT", "role": "Wicket-keeper"},
    {"id": "p_gt_8", "name": "Rashid Khan", "franchise": "GT", "role": "All-rounder"},
    {"id": "p_gt_9", "name": "Rahul Tewatia", "franchise": "GT", "role": "All-rounder"},
    {"id": "p_gt_10", "name": "Mahipal Lomror", "franchise": "GT", "role": "All-rounder"},
    {"id": "p_gt_11", "name": "Kagiso Rabada", "franchise": "GT", "role": "Bowler"},
    {"id": "p_gt_12", "name": "Mohammed Siraj", "franchise": "GT", "role": "Bowler"},
    {"id": "p_gt_13", "name": "Gerald Coetzee", "franchise": "GT", "role": "Bowler"},
    {"id": "p_gt_14", "name": "Prasidh Krishna", "franchise": "GT", "role": "Bowler"},
    
    # ── LSG ──
    {"id": "p_lsg_1", "name": "Rishabh Pant", "franchise": "LSG", "role": "Wicket-keeper"},
    {"id": "p_lsg_2", "name": "Nicholas Pooran", "franchise": "LSG", "role": "Wicket-keeper"},
    {"id": "p_lsg_3", "name": "Josh Inglis", "franchise": "LSG", "role": "Wicket-keeper"},
    {"id": "p_lsg_4", "name": "Aiden Markram", "franchise": "LSG", "role": "Batsman"},
    {"id": "p_lsg_5", "name": "Abdul Samad", "franchise": "LSG", "role": "Batsman"},
    {"id": "p_lsg_6", "name": "Ayush Badoni", "franchise": "LSG", "role": "All-rounder"},
    {"id": "p_lsg_7", "name": "Mitchell Marsh", "franchise": "LSG", "role": "All-rounder"},
    {"id": "p_lsg_8", "name": "Shahbaz Ahmed", "franchise": "LSG", "role": "All-rounder"},
    {"id": "p_lsg_9", "name": "Wanindu Hasaranga", "franchise": "LSG", "role": "All-rounder"},
    {"id": "p_lsg_10", "name": "Digvesh Rathi", "franchise": "LSG", "role": "Bowler"},
    {"id": "p_lsg_11", "name": "Mohammed Shami", "franchise": "LSG", "role": "Bowler"},
    {"id": "p_lsg_12", "name": "Mayank Yadav", "franchise": "LSG", "role": "Bowler"},
    {"id": "p_lsg_13", "name": "Avesh Khan", "franchise": "LSG", "role": "Bowler"},
    {"id": "p_lsg_14", "name": "Mohsin Khan", "franchise": "LSG", "role": "Bowler"},
    {"id": "p_lsg_15", "name": "Anrich Nortje", "franchise": "LSG", "role": "Bowler"},
    
    # ── DC ──
    {"id": "p_dc_1", "name": "KL Rahul", "franchise": "DC", "role": "Wicket-keeper"},
    {"id": "p_dc_2", "name": "Faf du Plessis", "franchise": "DC", "role": "Batsman"},
    {"id": "p_dc_3", "name": "Harry Brook", "franchise": "DC", "role": "Batsman"},
    {"id": "p_dc_4", "name": "Tristan Stubbs", "franchise": "DC", "role": "Wicket-keeper"},
    {"id": "p_dc_5", "name": "Abishek Porel", "franchise": "DC", "role": "Wicket-keeper"},
    {"id": "p_dc_6", "name": "Axar Patel", "franchise": "DC", "role": "All-rounder"},
    {"id": "p_dc_7", "name": "Ashutosh Sharma", "franchise": "DC", "role": "All-rounder"},
    {"id": "p_dc_8", "name": "Sameer Rizvi", "franchise": "DC", "role": "Batsman"},
    {"id": "p_dc_9", "name": "Mitchell Starc", "franchise": "DC", "role": "Bowler"},
    {"id": "p_dc_10", "name": "Kuldeep Yadav", "franchise": "DC", "role": "Bowler"},
    {"id": "p_dc_11", "name": "Mukesh Kumar", "franchise": "DC", "role": "Bowler"},
    {"id": "p_dc_12", "name": "T Natarajan", "franchise": "DC", "role": "Bowler"},
    {"id": "p_dc_13", "name": "Ishant Sharma", "franchise": "DC", "role": "Bowler"},
    
    # ── PBKS ──
    {"id": "p_pbks_1", "name": "Shreyas Iyer", "franchise": "PBKS", "role": "Batsman"},
    {"id": "p_pbks_2", "name": "Priyansh Arya", "franchise": "PBKS", "role": "Batsman"},
    {"id": "p_pbks_3", "name": "Nehal Wadhera", "franchise": "PBKS", "role": "Batsman"},
    {"id": "p_pbks_4", "name": "Rilee Rossouw", "franchise": "PBKS", "role": "Batsman"},
    {"id": "p_pbks_5", "name": "Shashank Singh", "franchise": "PBKS", "role": "Batsman"},
    {"id": "p_pbks_6", "name": "Prabhsimran Singh", "franchise": "PBKS", "role": "Wicket-keeper"},
    {"id": "p_pbks_7", "name": "Marcus Stoinis", "franchise": "PBKS", "role": "All-rounder"},
    {"id": "p_pbks_8", "name": "Azmatullah Omarzai", "franchise": "PBKS", "role": "All-rounder"},
    {"id": "p_pbks_9", "name": "Cooper Connolly", "franchise": "PBKS", "role": "All-rounder"},
    {"id": "p_pbks_10", "name": "Harpreet Brar", "franchise": "PBKS", "role": "All-rounder"},
    {"id": "p_pbks_11", "name": "Mitch Owen", "franchise": "PBKS", "role": "Batsman"},
    {"id": "p_pbks_12", "name": "Arshdeep Singh", "franchise": "PBKS", "role": "Bowler"},
    {"id": "p_pbks_13", "name": "Marco Jansen", "franchise": "PBKS", "role": "Bowler"},
    {"id": "p_pbks_14", "name": "Yuzvendra Chahal", "franchise": "PBKS", "role": "Bowler"},
    {"id": "p_pbks_15", "name": "Lockie Ferguson", "franchise": "PBKS", "role": "Bowler"},
    {"id": "p_pbks_16", "name": "Ben Dwarshuis", "franchise": "PBKS", "role": "Bowler"},
    {"id": "p_pbks_17", "name": "Praveen Dubey", "franchise": "PBKS", "role": "Bowler"},
]

# All 88 matches (84 league + 4 playoffs)
LEAGUE_MATCHES = [
    {"id": "m1", "no": 1, "date": "2026-03-28", "t1": "RCB", "t2": "SRH", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "m2", "no": 2, "date": "2026-03-29", "t1": "MI", "t2": "KKR", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m3", "no": 3, "date": "2026-03-30", "t1": "CSK", "t2": "RR", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m4", "no": 4, "date": "2026-04-01", "t1": "LSG", "t2": "DC", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m5", "no": 5, "date": "2026-04-01", "t1": "SRH", "t2": "KKR", "venue": "Eden Gardens, Kolkata"},
    {"id": "m6", "no": 6, "date": "2026-04-02", "t1": "GT", "t2": "PBKS", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m7", "no": 7, "date": "2026-04-03", "t1": "CSK", "t2": "PBKS", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m8", "no": 8, "date": "2026-04-04", "t1": "MI", "t2": "RCB", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m9", "no": 9, "date": "2026-04-05", "t1": "RR", "t2": "DC", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m10", "no": 10, "date": "2026-04-05", "t1": "GT", "t2": "LSG", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m11", "no": 11, "date": "2026-04-06", "t1": "SRH", "t2": "CSK", "venue": "Rajiv Gandhi Stadium, Hyderabad"},
    {"id": "m12", "no": 12, "date": "2026-04-06", "t1": "KKR", "t2": "PBKS", "venue": "Eden Gardens, Kolkata"},
    {"id": "m13", "no": 13, "date": "2026-04-07", "t1": "MI", "t2": "RR", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m14", "no": 14, "date": "2026-04-08", "t1": "DC", "t2": "RCB", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m15", "no": 15, "date": "2026-04-09", "t1": "GT", "t2": "SRH", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m16", "no": 16, "date": "2026-04-09", "t1": "LSG", "t2": "KKR", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m17", "no": 17, "date": "2026-04-10", "t1": "PBKS", "t2": "RR", "venue": "HPCA Stadium, Dharamsala"},
    {"id": "m18", "no": 18, "date": "2026-04-10", "t1": "CSK", "t2": "MI", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m19", "no": 19, "date": "2026-04-11", "t1": "DC", "t2": "SRH", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m20", "no": 20, "date": "2026-04-12", "t1": "RCB", "t2": "LSG", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "m21", "no": 21, "date": "2026-04-12", "t1": "KKR", "t2": "GT", "venue": "Eden Gardens, Kolkata"},
    {"id": "m22", "no": 22, "date": "2026-04-13", "t1": "RR", "t2": "CSK", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m23", "no": 23, "date": "2026-04-13", "t1": "MI", "t2": "PBKS", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m24", "no": 24, "date": "2026-04-14", "t1": "DC", "t2": "KKR", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m25", "no": 25, "date": "2026-04-15", "t1": "SRH", "t2": "RCB", "venue": "Rajiv Gandhi Stadium, Hyderabad"},
    {"id": "m26", "no": 26, "date": "2026-04-15", "t1": "LSG", "t2": "PBKS", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m27", "no": 27, "date": "2026-04-16", "t1": "GT", "t2": "RR", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m28", "no": 28, "date": "2026-04-16", "t1": "MI", "t2": "DC", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m29", "no": 29, "date": "2026-04-17", "t1": "CSK", "t2": "KKR", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m30", "no": 30, "date": "2026-04-18", "t1": "RCB", "t2": "GT", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "m31", "no": 31, "date": "2026-04-19", "t1": "SRH", "t2": "MI", "venue": "Rajiv Gandhi Stadium, Hyderabad"},
    {"id": "m32", "no": 32, "date": "2026-04-19", "t1": "RR", "t2": "LSG", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m33", "no": 33, "date": "2026-04-20", "t1": "PBKS", "t2": "DC", "venue": "HPCA Stadium, Dharamsala"},
    {"id": "m34", "no": 34, "date": "2026-04-20", "t1": "KKR", "t2": "RCB", "venue": "Eden Gardens, Kolkata"},
    {"id": "m35", "no": 35, "date": "2026-04-21", "t1": "GT", "t2": "CSK", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m36", "no": 36, "date": "2026-04-22", "t1": "MI", "t2": "SRH", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m37", "no": 37, "date": "2026-04-22", "t1": "DC", "t2": "RR", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m38", "no": 38, "date": "2026-04-23", "t1": "LSG", "t2": "RCB", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m39", "no": 39, "date": "2026-04-23", "t1": "PBKS", "t2": "KKR", "venue": "HPCA Stadium, Dharamsala"},
    {"id": "m40", "no": 40, "date": "2026-04-24", "t1": "CSK", "t2": "GT", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m41", "no": 41, "date": "2026-04-25", "t1": "RR", "t2": "SRH", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m42", "no": 42, "date": "2026-04-25", "t1": "MI", "t2": "LSG", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m43", "no": 43, "date": "2026-04-26", "t1": "KKR", "t2": "DC", "venue": "Eden Gardens, Kolkata"},
    {"id": "m44", "no": 44, "date": "2026-04-26", "t1": "RCB", "t2": "PBKS", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "m45", "no": 45, "date": "2026-04-27", "t1": "CSK", "t2": "SRH", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m46", "no": 46, "date": "2026-04-28", "t1": "GT", "t2": "MI", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m47", "no": 47, "date": "2026-04-28", "t1": "DC", "t2": "LSG", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m48", "no": 48, "date": "2026-04-29", "t1": "RR", "t2": "KKR", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m49", "no": 49, "date": "2026-04-29", "t1": "PBKS", "t2": "RCB", "venue": "HPCA Stadium, Dharamsala"},
    {"id": "m50", "no": 50, "date": "2026-04-30", "t1": "SRH", "t2": "GT", "venue": "Rajiv Gandhi Stadium, Hyderabad"},
    {"id": "m51", "no": 51, "date": "2026-05-01", "t1": "MI", "t2": "CSK", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m52", "no": 52, "date": "2026-05-01", "t1": "DC", "t2": "PBKS", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m53", "no": 53, "date": "2026-05-02", "t1": "LSG", "t2": "RR", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m54", "no": 54, "date": "2026-05-02", "t1": "KKR", "t2": "SRH", "venue": "Eden Gardens, Kolkata"},
    {"id": "m55", "no": 55, "date": "2026-05-03", "t1": "RCB", "t2": "CSK", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "m56", "no": 56, "date": "2026-05-04", "t1": "GT", "t2": "DC", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m57", "no": 57, "date": "2026-05-04", "t1": "PBKS", "t2": "LSG", "venue": "HPCA Stadium, Dharamsala"},
    {"id": "m58", "no": 58, "date": "2026-05-05", "t1": "SRH", "t2": "RR", "venue": "Rajiv Gandhi Stadium, Hyderabad"},
    {"id": "m59", "no": 59, "date": "2026-05-05", "t1": "MI", "t2": "KKR", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m60", "no": 60, "date": "2026-05-06", "t1": "CSK", "t2": "DC", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m61", "no": 61, "date": "2026-05-07", "t1": "RCB", "t2": "RR", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "m62", "no": 62, "date": "2026-05-07", "t1": "GT", "t2": "KKR", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m63", "no": 63, "date": "2026-05-08", "t1": "LSG", "t2": "SRH", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m64", "no": 64, "date": "2026-05-09", "t1": "PBKS", "t2": "MI", "venue": "HPCA Stadium, Dharamsala"},
    {"id": "m65", "no": 65, "date": "2026-05-09", "t1": "DC", "t2": "CSK", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m66", "no": 66, "date": "2026-05-10", "t1": "RR", "t2": "GT", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m67", "no": 67, "date": "2026-05-10", "t1": "KKR", "t2": "LSG", "venue": "Eden Gardens, Kolkata"},
    {"id": "m68", "no": 68, "date": "2026-05-11", "t1": "SRH", "t2": "PBKS", "venue": "Rajiv Gandhi Stadium, Hyderabad"},
    {"id": "m69", "no": 69, "date": "2026-05-12", "t1": "CSK", "t2": "RCB", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m70", "no": 70, "date": "2026-05-12", "t1": "MI", "t2": "GT", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m71", "no": 71, "date": "2026-05-13", "t1": "DC", "t2": "KKR", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m72", "no": 72, "date": "2026-05-14", "t1": "LSG", "t2": "CSK", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m73", "no": 73, "date": "2026-05-15", "t1": "RR", "t2": "PBKS", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m74", "no": 74, "date": "2026-05-16", "t1": "RCB", "t2": "KKR", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "m75", "no": 75, "date": "2026-05-17", "t1": "SRH", "t2": "LSG", "venue": "Rajiv Gandhi Stadium, Hyderabad"},
    {"id": "m76", "no": 76, "date": "2026-05-18", "t1": "GT", "t2": "PBKS", "venue": "Narendra Modi Stadium, Ahmedabad"},
    {"id": "m77", "no": 77, "date": "2026-05-18", "t1": "MI", "t2": "RR", "venue": "Wankhede Stadium, Mumbai"},
    {"id": "m78", "no": 78, "date": "2026-05-19", "t1": "CSK", "t2": "KKR", "venue": "Chidambaram Stadium, Chennai"},
    {"id": "m79", "no": 79, "date": "2026-05-19", "t1": "DC", "t2": "RCB", "venue": "Arun Jaitley Stadium, Delhi"},
    {"id": "m80", "no": 80, "date": "2026-05-20", "t1": "PBKS", "t2": "SRH", "venue": "HPCA Stadium, Dharamsala"},
    {"id": "m81", "no": 81, "date": "2026-05-20", "t1": "RR", "t2": "MI", "venue": "Sawai Mansingh Stadium, Jaipur"},
    {"id": "m82", "no": 82, "date": "2026-05-21", "t1": "KKR", "t2": "GT", "venue": "Eden Gardens, Kolkata"},
    {"id": "m83", "no": 83, "date": "2026-05-22", "t1": "LSG", "t2": "DC", "venue": "Ekana Stadium, Lucknow"},
    {"id": "m84", "no": 84, "date": "2026-05-24", "t1": "RCB", "t2": "CSK", "venue": "Chinnaswamy Stadium, Bengaluru"},
    {"id": "q1", "no": "Q1", "date": "2026-05-26", "t1": "TBD", "t2": "TBD", "venue": "TBD"},
    {"id": "el", "no": "EL", "date": "2026-05-27", "t1": "TBD", "t2": "TBD", "venue": "TBD"},
    {"id": "q2", "no": "Q2", "date": "2026-05-29", "t1": "TBD", "t2": "TBD", "venue": "TBD"},
    {"id": "final", "no": "Final", "date": "2026-05-31", "t1": "TBD", "t2": "TBD", "venue": "TBD"},
]

# Default admin user (password: "admin")
DEFAULT_ADMIN = {
    "id": "admin-ankur",
    "username": "ankur.citm@gmail.com",
    "passwordHash": sha256("admin"),
    "role": "admin",
    "editPerms": []
}

DEFAULT_SETTINGS = {
    "teamAName": "Ankur",
    "teamBName": "Sarawat",
    "maxSubstitutions": 8,
    "scoring": {
        "runPoints": 1,
        "wicketPoints": 20,
        "bonus34Wickets": 10,
        "bonus5PlusWickets": 20,
        "bonus50to99Runs": 10,
        "bonus100PlusRuns": 20
    }
}

async def seed_database():
    """Seed the database with initial data"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding IPL Fantasy League database...")
    
    # Clear existing data
    print("  - Clearing existing data...")
    await db.users.delete_many({})
    await db.players.delete_many({})
    await db.matches.delete_many({})
    await db.teams.delete_many({})
    await db.settings.delete_many({})
    await db.substitutions.delete_many({})
    await db.match_points.delete_many({})
    
    # Seed users
    print("  - Creating default admin user...")
    await db.users.insert_one(DEFAULT_ADMIN)
    
    # Seed players
    print(f"  - Adding {len(INITIAL_PLAYERS)} players...")
    await db.players.insert_many(INITIAL_PLAYERS)
    
    # Seed matches
    print(f"  - Adding {len(LEAGUE_MATCHES)} matches...")
    await db.matches.insert_many(LEAGUE_MATCHES)
    
    # Initialize empty teams
    print("  - Initializing empty teams...")
    await db.teams.insert_one({"teamA": [], "teamB": []})
    
    # Seed settings
    print("  - Setting default configuration...")
    await db.settings.insert_one(DEFAULT_SETTINGS)
    
    # Initialize substitutions
    print("  - Initializing substitution counters...")
    await db.substitutions.insert_one({"teamA": 0, "teamB": 0})
    
    print("✅ Database seeding complete!")
    print(f"\n📊 Summary:")
    print(f"   Users: 1 (admin)")
    print(f"   Players: {len(INITIAL_PLAYERS)}")
    print(f"   Matches: {len(LEAGUE_MATCHES)}")
    print(f"   Teams: Ankur & Sarawat (empty)")
    print(f"\n🔑 Default Login:")
    print(f"   Username: ankur.citm@gmail.com")
    print(f"   Password: admin")
    print(f"   ⚠️  Please change this password immediately!\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
