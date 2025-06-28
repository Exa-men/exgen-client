import streamlit as st
import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL")
API_KEY = os.getenv("API_KEY")

# Helper function for API calls
def make_api_request(endpoint, method="GET", data=None):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    url = f"{API_BASE_URL}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)

        if response.status_code == 401:
            st.error("Authentication failed. Check your API key.")
            return None
        elif response.status_code >= 400:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None

        return response.json()

    except requests.exceptions.RequestException as e:
        st.error(f"Connection error: {str(e)}")
        return None

# Streamlit UI
st.set_page_config(page_title="Your App Dashboard", layout="wide")
st.title("🚀 Your App Dashboard")

# Sidebar for navigation (if you have multiple endpoints)
st.sidebar.title("Navigation")
page = st.sidebar.selectbox("Choose a page", ["Dashboard", "Data Entry", "Settings"])

if page == "Dashboard":
    st.header("Dashboard")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Fetch Data", type="primary"):
            with st.spinner("Loading..."):
                data = make_api_request("/your-endpoint")
                if data:
                    st.success("Data loaded successfully!")
                    st.json(data)

    with col2:
        st.metric("API Status", "Connected" if API_BASE_URL else "Not configured")

elif page == "Data Entry":
    st.header("Data Entry")

    with st.form("data_form"):
        name = st.text_input("Name")
        value = st.number_input("Value", min_value=0)
        submitted = st.form_submit_button("Submit")

        if submitted:
            payload = {"name": name, "value": value}
            result = make_api_request("/your-post-endpoint", method="POST", data=payload)
            if result:
                st.success("Data submitted successfully!")
                st.json(result)

elif page == "Settings":
    st.header("Settings")
    st.info(f"API Base URL: {API_BASE_URL}")
    st.info("API Key: " + ("✅ Configured" if API_KEY else "❌ Missing"))

# Footer
st.sidebar.markdown("---")
st.sidebar.markdown("Built with Streamlit + FastAPI")
