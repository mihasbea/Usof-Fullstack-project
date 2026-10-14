export async function apiClient(endpoint) {
    const response = await fetch(`${process.env.REACT_APP_API_URL ?? 'http://localhost:3000'}${endpoint}`);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}
