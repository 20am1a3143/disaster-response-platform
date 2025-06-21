import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const API_URL = "http://localhost:4000";
const MOCK_USERS = ['netrunnerX', 'reliefAdmin', 'citizen1'];

const socket = io(API_URL);

function App() {
    const [currentUser, setCurrentUser] = useState(MOCK_USERS[0]);
    const [disasters, setDisasters] = useState([]);
    const [selectedDisaster, setSelectedDisaster] = useState(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Data displays
    const [socialReports, setSocialReports] = useState([]);
    const [resources, setResources] =useState([]);
    const [officialUpdates, setOfficialUpdates] = useState([]);
    const [verificationResult, setVerificationResult] = useState(null);

    const getAuthHeader = () => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser}`,
    });

    const fetchDisasters = () => {
        fetch(`${API_URL}/disasters`)
            .then((res) => res.json())
            .then(setDisasters)
            .catch(err => console.error("Failed to fetch disasters:", err));
    };

    useEffect(() => {
        fetchDisasters();
        socket.on("disaster_updated", (data) => {
            console.log("Disaster update received:", data);
            fetchDisasters();
        });
        socket.on("social_media_updated", (data) => {
            console.log("Social media update received:", data);
            if (selectedDisaster && selectedDisaster.id === data.disaster_id) {
                setSocialReports(data.reports);
            }
        });
        socket.on("resources_updated", (data) => {
            console.log("Resources update received:", data);
             if (selectedDisaster && selectedDisaster.id === data.disaster_id) {
                setResources(data.resources);
            }
        });

        return () => {
            socket.off("disaster_updated");
            socket.off("social_media_updated");
            socket.off("resources_updated");
        };
    }, [selectedDisaster]);

    const handleCreateDisaster = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/disasters`, {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify({
                title,
                description,
                tags: tags.split(",").map((t) => t.trim()),
            }),
        });
        setTitle("");
        setDescription("");
        setTags("");
    };

    const handleSelectDisaster = (disaster) => {
        setSelectedDisaster(disaster);
        // Clear previous data
        setSocialReports([]);
        setResources([]);
        setOfficialUpdates([]);
        setVerificationResult(null);
    };
    
    const handleGetSocial = () => {
        if (!selectedDisaster) return;
        fetch(`${API_URL}/disasters/${selectedDisaster.id}/social-media`, { headers: getAuthHeader() })
            .then(res => res.json()).then(setSocialReports);
    };

    const handleGetResources = () => {
        if (!selectedDisaster) return;
        fetch(`${API_URL}/disasters/${selectedDisaster.id}/resources`, { headers: getAuthHeader() })
            .then(res => res.json()).then(setResources);
    };

    const handleGetUpdates = () => {
         if (!selectedDisaster) return;
        fetch(`${API_URL}/disasters/${selectedDisaster.id}/official-updates`, { headers: getAuthHeader() })
            .then(res => res.json()).then(setOfficialUpdates);
    };

    const handleVerifyImage = (e) => {
        e.preventDefault();
        if (!selectedDisaster || !imageUrl) return;
        fetch(`${API_URL}/disasters/${selectedDisaster.id}/verify-image`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ image_url: imageUrl })
        }).then(res => res.json()).then(setVerificationResult);
    };

    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: "auto", padding: 20 }}>
            <h1>Disaster Response Platform</h1>
            <div>
                Current User: 
                <select value={currentUser} onChange={(e) => setCurrentUser(e.target.value)}>
                    {MOCK_USERS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            <hr />

            <section>
                <h2>Create Disaster</h2>
                <form onSubmit={handleCreateDisaster}>
                    <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required /><br />
                    <textarea placeholder="Description (e.g., 'Flooding in downtown Boston')" value={description} onChange={(e) => setDescription(e.target.value)} required style={{width: '100%', minHeight: '60px'}}></textarea><br />
                    <input placeholder="Tags (comma,separated)" value={tags} onChange={(e) => setTags(e.target.value)} /><br />
                    <button type="submit">Create Disaster</button>
                </form>
            </section>
            <hr />

            <section>
                <h2>Disasters</h2>
                <ul>
                    {Array.isArray(disasters) && disasters.map((d) => (
                        <li key={d.id} onClick={() => handleSelectDisaster(d)} style={{ cursor: 'pointer', padding: '5px', backgroundColor: selectedDisaster?.id === d.id ? '#e0e0e0' : 'transparent' }}>
                            <b>{d.title}</b> ({d.location_name || 'Location TBD'})<br />
                            <small>Tags: {d.tags && d.tags.join(", ")} | Owner: {d.owner_id}</small>
                        </li>
                    ))}
                </ul>
            </section>
            <hr />

            {selectedDisaster && (
                <section>
                    <h2>Details for: {selectedDisaster.title}</h2>
                    <button onClick={handleGetSocial}>Get Social Media Reports</button>
                    <button onClick={handleGetResources}>Get Nearby Resources</button>
                    <button onClick={handleGetUpdates}>Get Official Updates</button>
                    
                    {socialReports.length > 0 && <div><h3>Social Media</h3><ul>{socialReports.map((r, i) => <li key={i}>"{r.post}" - <i>{r.user}</i></li>)}</ul></div>}
                    {resources.length > 0 && <div><h3>Nearby Resources</h3><ul>{resources.map(r => <li key={r.id}>{r.name} ({r.type}) at {r.location_name}</li>)}</ul></div>}
                    {officialUpdates.length > 0 && <div><h3>Official Updates</h3><ul>{officialUpdates.map((u, i) => <li key={i}><a href={u.link} target="_blank" rel="noopener noreferrer">{u.update}</a> ({u.source})</li>)}</ul></div>}

                    <h3>Verify Image</h3>
                    <form onSubmit={handleVerifyImage}>
                        <input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{width: '80%'}}/>
                        <button type="submit">Verify</button>
                    </form>
                    {verificationResult && <div><b>Verification:</b> {verificationResult.reason}</div>}
                </section>
            )}
        </div>
    );
}

export default App;