package com.clec.economy.auth;

public class AuthUserResponse {
    private final String id;
    private final String username;
    private final String displayName;
    private final StaffRole role;

    public AuthUserResponse(StaffUserEntity user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.displayName = user.getDisplayName();
        this.role = user.getRole();
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public StaffRole getRole() { return role; }
}
