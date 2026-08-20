using System.Collections.Concurrent;

namespace BudgetPlanner.Import;

public interface IImportPreviewAdmission
{
    IDisposable? TryAcquire(string userId);
}

public sealed class ImportPreviewAdmission : IImportPreviewAdmission
{
    private readonly ConcurrentDictionary<string, byte> _activeUsers = new();

    public IDisposable? TryAcquire(string userId) =>
        _activeUsers.TryAdd(userId, 0) ? new Lease(_activeUsers, userId) : null;

    private sealed class Lease(ConcurrentDictionary<string, byte> activeUsers, string userId) : IDisposable
    {
        private int _disposed;
        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 0)
                activeUsers.TryRemove(userId, out _);
        }
    }
}
