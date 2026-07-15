import networkx as nx


def build_dag(parsed: dict) -> tuple[list[dict], list[dict]]:
    graph = nx.DiGraph(); graph.add_node("intent", title="Intent Parse", kind="analysis")
    if parsed.get("action") == "multi_platform_social_publish":
        graph.add_node("core", title="Draft Core Message", kind="generation"); graph.add_edge("intent", "core")
        graph.add_node("tailor", title="Tailor per Platform", kind="generation"); graph.add_edge("core", "tailor")
        for platform in parsed.get("entities", {}).get("channels") or ["twitter", "linkedin", "facebook", "whatsapp"]:
            approval=f"approval-{platform}"; graph.add_node(approval, title=f"Approve: {platform.title()}", kind="approval", isApprovalGate=True); graph.add_edge("tailor", approval)
            graph.add_node(platform, title="Twitter / X" if platform == "twitter" else platform.title(), kind="social"); graph.add_edge(approval, platform)
    else: graph.add_node("execute", title="Execute Approved Goal", kind="tool"); graph.add_edge("intent", "execute")
    if not nx.is_directed_acyclic_graph(graph): raise ValueError("Workflow planner generated a cycle.")
    tasks=[{"id":node, **attrs, "status":"waiting_approval" if attrs.get("isApprovalGate") else "pending", "dependsOn":list(graph.predecessors(node))} for node, attrs in graph.nodes(data=True)]
    tasks[0]["status"]="done"
    return tasks, [{"source":source,"target":target} for source,target in graph.edges]
